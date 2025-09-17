import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { ProxyAgent, fetch as undiciFetch, setGlobalDispatcher } from 'undici';

interface TableMetadata {
  table_schema: string;
  table_name: string;
  table_type: string;
}

interface Policy {
  schemaname: string;
  tablename: string;
  policyname: string;
  roles: string[] | null;
  cmd: string | null;
  qual: string | null;
  with_check: string | null;
  permissive: boolean | null;
}

interface ConstraintRow {
  oid: number;
  conname: string;
  contype: string;
  conrelid: number | null;
  confrelid: number | null;
  connamespace: number | null;
  conkey: number[] | null;
  confkey: number[] | null;
}

interface PgClassRow {
  oid: number;
  relname: string;
  relnamespace: number;
  relkind: string;
}

interface PgNamespaceRow {
  oid: number;
  nspname: string;
}

interface PgIndexRow {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

const OUTPUT_DIR = path.resolve(process.cwd(), 'exports', 'db');
const PAGE_SIZE = 1000;

const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? null;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

const fetchImpl: typeof fetch = (input, init) =>
  (undiciFetch(input as any, init as any) as unknown) as Promise<Response>;

let supabaseUrlGlobal: string | null = null;
let supabaseKeyGlobal: string | null = null;

function getSupabaseClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) environment variable.');
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceKey ?? anonKey;
  if (!key) {
    throw new Error('Missing Supabase service role key or anon key.');
  }

  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not provided, falling back to anon key.');
  }

  supabaseUrlGlobal = url;
  supabaseKeyGlobal = key;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetchImpl,
      headers: {
        // The service key needs elevated privileges; this header makes sure
        // we always send it even if we fall back to anon.
        apikey: key,
      },
    },
  });
}

async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function fetchAllRows<T>(
  client: SupabaseClient,
  table: string,
  select = '*',
  schema?: string,
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const builder = schema ? client.schema(schema).from(table) : client.from(table);
    const query = builder.select(select).range(from, to);
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    results.push(...((data as unknown) as T[]));

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return results;
}

async function fetchTableMetadata(client: SupabaseClient): Promise<TableMetadata[]> {
  const { data, error } = await client
    .schema('information_schema')
    .from('tables')
    .select('table_schema, table_name, table_type')
    .order('table_schema', { ascending: true })
    .order('table_name', { ascending: true });

  if (error) {
    console.warn('Unable to query information_schema.tables:', error);
    console.warn('Falling back to GraphQL introspection for table metadata.');
    return fetchTableMetadataViaGraphql();
  }

  if (!data) {
    console.warn('information_schema.tables returned no data; using GraphQL fallback.');
    return fetchTableMetadataViaGraphql();
  }

  return data.filter((row) => !['pg_catalog', 'information_schema'].includes(row.table_schema));
}

async function fetchTableMetadataViaGraphql(): Promise<TableMetadata[]> {
  if (!supabaseUrlGlobal || !supabaseKeyGlobal) {
    return [];
  }

  try {
    const response = await fetchImpl(`${supabaseUrlGlobal}/graphql/v1`, {
      method: 'POST',
      headers: {
        apikey: supabaseKeyGlobal,
        Authorization: `Bearer ${supabaseKeyGlobal}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ __schema { types { name kind } } }',
      }),
    });

    if (!response.ok) {
      console.warn('GraphQL introspection fallback failed:', response.status, await response.text());
      return [];
    }

    const result = (await response.json()) as {
      data?: { __schema?: { types?: { name: string; kind: string }[] } };
    };

    const types = result.data?.__schema?.types ?? [];
    const tableNames = types
      .filter((item) => item.kind === 'OBJECT' && /^[a-z0-9_]+$/.test(item.name))
      .map((item) => item.name)
      .sort((a, b) => a.localeCompare(b));

    return tableNames.map((name) => ({
      table_schema: 'public',
      table_name: name,
      table_type: 'BASE TABLE',
    }));
  } catch (error) {
    console.warn('GraphQL introspection fallback threw an error:', error);
    return [];
  }
}

async function fetchTableRows(
  client: SupabaseClient,
  schema: string,
  table: string,
): Promise<unknown[] | null> {
  const relation = schema === 'public' ? table : `${schema}.${table}`;
  try {
    const rows = await fetchAllRows<unknown>(
      client,
      table,
      '*',
      schema === 'public' ? undefined : schema,
    );
    return rows;
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error) {
      const code = (error as { code?: string }).code;
      if (code === '42501' || code === 'PGRST301' || code === 'PGRST302') {
        console.warn(`Skipping ${relation}: access denied.`);
        return null;
      }
    }

    console.warn(`Failed to dump ${relation}:`, error);
    return null;
  }
}

async function fetchPolicies(client: SupabaseClient): Promise<Policy[]> {
  try {
    const data = await fetchAllRows<Policy>(
      client,
      'pg_policies',
      'schemaname, tablename, policyname, roles, cmd, qual, with_check, permissive',
      'pg_catalog',
    );
    return data;
  } catch (error) {
    console.warn('Unable to query pg_policies:', error);
    return [];
  }
}

async function fetchPgClass(client: SupabaseClient): Promise<PgClassRow[]> {
  return fetchAllRows<PgClassRow>(
    client,
    'pg_class',
    'oid, relname, relnamespace, relkind',
    'pg_catalog',
  );
}

async function fetchPgNamespace(client: SupabaseClient): Promise<PgNamespaceRow[]> {
  return fetchAllRows<PgNamespaceRow>(client, 'pg_namespace', 'oid, nspname', 'pg_catalog');
}

async function fetchConstraints(client: SupabaseClient) {
  try {
    const [constraints, namespaces, classes] = await Promise.all([
      fetchAllRows<ConstraintRow>(
        client,
        'pg_constraint',
        'oid, conname, contype, conrelid, confrelid, connamespace, conkey, confkey',
        'pg_catalog',
      ),
      fetchPgNamespace(client),
      fetchPgClass(client),
    ]);

    const namespaceByOid = new Map<number, string>();
    for (const ns of namespaces) {
      namespaceByOid.set(ns.oid, ns.nspname);
    }

    const classByOid = new Map<number, PgClassRow>();
    for (const cls of classes) {
      classByOid.set(cls.oid, cls);
    }

    const constraintOutput = constraints.map((constraint) => {
      const rel = constraint.conrelid != null ? classByOid.get(constraint.conrelid) : undefined;
      const ref = constraint.confrelid != null ? classByOid.get(constraint.confrelid) : undefined;
      const schemaName =
        constraint.connamespace != null ? namespaceByOid.get(constraint.connamespace) ?? null : null;
      const tableSchema = rel ? namespaceByOid.get(rel.relnamespace) ?? schemaName : schemaName;
      const tableName = rel?.relname ?? null;
      const referencedSchema = ref ? namespaceByOid.get(ref.relnamespace) ?? null : null;
      const referencedTable = ref?.relname ?? null;

      return {
        name: constraint.conname,
        type: constraint.contype,
        schema: tableSchema,
        table: tableName,
        referencedSchema,
        referencedTable,
        keyColumns: constraint.conkey,
        referencedColumns: constraint.confkey,
      };
    });

    const indexes = await fetchAllRows<PgIndexRow>(
      client,
      'pg_indexes',
      'schemaname, tablename, indexname, indexdef',
      'pg_catalog',
    );

    return { constraints: constraintOutput, indexes };
  } catch (error) {
    console.warn('Unable to query constraints or indexes:', error);
    return { constraints: [], indexes: [] };
  }
}

async function fetchRowEstimates(client: SupabaseClient): Promise<Record<string, number>> {
  try {
    const stats = await fetchAllRows<{ schemaname: string; relname: string; n_live_tup: number }>(
      client,
      'pg_stat_user_tables',
      'schemaname, relname, n_live_tup',
      'pg_catalog',
    );

    const result: Record<string, number> = {};
    for (const row of stats) {
      const key = `${row.schemaname}.${row.relname}`;
      result[key] = row.n_live_tup;
    }

    return result;
  } catch (error) {
    console.warn('Unable to query pg_stat_user_tables:', error);
    return {};
  }
}

async function writeJson(relativePath: string, value: unknown): Promise<void> {
  const filePath = path.join(OUTPUT_DIR, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function dumpTables(client: SupabaseClient, tables: TableMetadata[]): Promise<void> {
  const rowEstimates = await fetchRowEstimates(client);

  for (const table of tables) {
    const schema = table.table_schema;
    const name = table.table_name;
    const key = `${schema}.${name}`;

    const tableRows = await fetchTableRows(client, schema, name);
    if (!tableRows) {
      continue;
    }

    const payload = {
      schema,
      table: name,
      rowEstimate: rowEstimates[key] ?? null,
      rowCount: Array.isArray(tableRows) ? tableRows.length : null,
      rows: tableRows,
    };

    const fileName = schema === 'public' ? `${name}.json` : `${schema}.${name}.json`;
    await writeJson(fileName, payload);

    console.log(`Exported ${schema}.${name} (${payload.rowCount ?? 0} rows).`);
  }
}

async function main() {
  await ensureOutputDir();
  const client = getSupabaseClient();

  const tables = await fetchTableMetadata(client);
  console.log(`Found ${tables.length} tables/views.`);

  await dumpTables(client, tables);

  const policies = await fetchPolicies(client);
  await writeJson('_policies.json', policies);
  console.log(`Exported ${policies.length} policies.`);

  const { constraints, indexes } = await fetchConstraints(client);
  await writeJson('_constraints.json', { constraints, indexes });
  console.log(`Exported ${constraints.length} constraints and ${indexes.length} indexes.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
