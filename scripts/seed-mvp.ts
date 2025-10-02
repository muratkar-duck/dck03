import * as dotenv from 'dotenv';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

type Role = 'writer' | 'producer';

type EnsureUserOptions = {
  email: string;
  password: string;
  role: Role;
};

type ScriptSeed = {
  title: string;
  genre: string;
  length: number;
  synopsis: string;
  description: string;
  price_cents: number;
};

type ListingSeed = {
  title: string;
  genre: string;
  description: string;
  budget: number;
};

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable.');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listAuthUsers() {
  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) {
    throw error;
  }

  return data.users as User[];
}

async function findAuthUserByEmail(email: string) {
  const users = await listAuthUsers();
  const lower = email.toLowerCase();
  return users.find((user) => (user.email ?? '').toLowerCase() === lower) ?? null;
}

async function ensureUser({ email, password, role }: EnsureUserOptions) {
  console.log(`\nEnsuring user: ${email}`);

  let userId: string | null = null;

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  });

  if (createError) {
    const alreadyExists =
      typeof createError.message === 'string' &&
      createError.message.toLowerCase().includes('already registered');

    if (!alreadyExists) {
      throw createError;
    }

    const existing = await findAuthUserByEmail(email);

    if (!existing) {
      throw new Error(
        `User ${email} appears to exist but could not be retrieved via admin API.`
      );
    }

    userId = existing.id;

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        password,
        user_metadata: { ...(existing.user_metadata ?? {}), role },
      }
    );

    if (updateError) {
      throw updateError;
    }
  } else {
    const newUser = created?.user;
    if (!newUser?.id) {
      throw new Error(`Auth user creation succeeded without id for ${email}`);
    }
    userId = newUser.id;
  }

  if (!userId) {
    throw new Error(`Failed to resolve user id for ${email}`);
  }

  const { error: upsertError } = await adminClient.from('users').upsert(
    {
      id: userId,
      email,
      role,
    },
    { onConflict: 'id' }
  );

  if (upsertError) {
    throw upsertError;
  }

  console.log(`✔ User ready (${role}) → ${userId}`);
  return { id: userId, email, role };
}

async function ensureScript(
  client: SupabaseClient,
  ownerId: string,
  payload: ScriptSeed
) {
  const { data: existing, error: selectError } = await client
    .from('scripts')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('title', payload.title)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    const { error: updateError } = await client
      .from('scripts')
      .update({ ...payload })
      .eq('id', existing.id);

    if (updateError) {
      throw updateError;
    }

    return { id: existing.id, price_cents: payload.price_cents };
  }

  const { data, error } = await client
    .from('scripts')
    .insert([{ owner_id: ownerId, ...payload }])
    .select('id, price_cents')
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string; price_cents: number };
}

async function ensureListing(
  client: SupabaseClient,
  ownerId: string,
  payload: ListingSeed
) {
  const { data: existing, error: selectError } = await client
    .from('producer_listings')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('title', payload.title)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    const { error: updateError } = await client
      .from('producer_listings')
      .update({ ...payload })
      .eq('id', existing.id);

    if (updateError) {
      throw updateError;
    }

    return { id: existing.id };
  }

  const { data, error } = await client
    .from('producer_listings')
    .insert([{ owner_id: ownerId, ...payload, created_at: new Date().toISOString() }])
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string };
}

async function ensureApplication(
  client: SupabaseClient,
  params: { listingId: string; writerId: string; scriptId: string; status: string }
) {
  const { data: existing, error: selectError } = await client
    .from('applications')
    .select('id, status')
    .eq('listing_id', params.listingId)
    .eq('writer_id', params.writerId)
    .eq('script_id', params.scriptId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    if (existing.status !== params.status) {
      const { error: updateError } = await client
        .from('applications')
        .update({ status: params.status })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }
    }

    return existing.id;
  }

  const { data, error } = await client
    .from('applications')
    .insert([
      {
        listing_id: params.listingId,
        writer_id: params.writerId,
        script_id: params.scriptId,
        status: params.status,
      },
    ])
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return (data as { id: string }).id;
}

async function ensureOrder(
  client: SupabaseClient,
  params: { scriptId: string; buyerId: string; amountCents: number }
) {
  const { data: existing, error: selectError } = await client
    .from('orders')
    .select('id, amount_cents')
    .eq('script_id', params.scriptId)
    .eq('buyer_id', params.buyerId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    if (existing.amount_cents !== params.amountCents) {
      const { error: updateError } = await client
        .from('orders')
        .update({ amount_cents: params.amountCents })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }
    }

    return existing.id;
  }

  const { data, error } = await client
    .from('orders')
    .insert([
      {
        script_id: params.scriptId,
        buyer_id: params.buyerId,
        amount_cents: params.amountCents,
      },
    ])
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return (data as { id: string }).id;
}

async function ensureConversation(
  client: SupabaseClient,
  applicationId: string
) {
  const { data, error } = await client
    .from('conversations')
    .upsert({ application_id: applicationId }, { onConflict: 'application_id' })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return (data as { id: string }).id;
}

async function ensureMessage(
  client: SupabaseClient,
  params: { conversationId: string; senderId: string; body: string; createdAt: string }
) {
  const { data: existing, error: selectError } = await client
    .from('messages')
    .select('id')
    .eq('conversation_id', params.conversationId)
    .eq('sender_id', params.senderId)
    .eq('body', params.body)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await client
    .from('messages')
    .insert([
      {
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        body: params.body,
        created_at: params.createdAt,
      },
    ])
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return (data as { id: string }).id;
}

async function ensureConversationParticipant(
  client: SupabaseClient,
  params: { conversationId: string; userId: string; role: Role }
) {
  const { error } = await client
    .from('conversation_participants')
    .upsert(
      [
        {
          conversation_id: params.conversationId,
          user_id: params.userId,
          role: params.role,
        },
      ],
      { onConflict: 'conversation_id,user_id' }
    );

  if (error) {
    throw error;
  }
}

async function main() {
  console.log('🌱 Seeding MVP demo data...');

  const demoPassword = 'password';

  const writer = await ensureUser({
    email: 'writer@ducktylo.test',
    password: demoPassword,
    role: 'writer',
  });

  const producer = await ensureUser({
    email: 'producer@ducktylo.test',
    password: demoPassword,
    role: 'producer',
  });

  const scriptSeeds: ScriptSeed[] = [
    {
      title: 'Göbeklitepe Günlükleri',
      genre: 'Belgesel',
      length: 52,
      synopsis:
        'Urfa ovasındaki arkeolog ekibinin, dünyanın bilinen en eski tapınağının sırlarını açığa çıkarma yolculuğu.',
      description:
        'Yeni keşfedilen bir odanın açılışından, bölgedeki halkın ritüellerine uzanan kapsamlı bir belgesel. Duygusal anlatımı ve çarpıcı görselleriyle festival seçkilerine uygun.',
      price_cents: 95000,
    },
    {
      title: 'Sahildeki Düşler',
      genre: 'Dram',
      length: 104,
      synopsis:
        'Aile baskısından kaçıp küçük bir sahil kasabasına sığınan genç bir kadının, kendi sesini bulma hikayesi.',
      description:
        'Türkiye’nin Ege kıyılarında geçen, üç neslin çatışmasını anlatan sıcak ve içten bir dram. Ulusal yarışmalara uygun, karakter odaklı sahneler içerir.',
      price_cents: 210000,
    },
  ];

  const scripts = [] as { id: string; price_cents: number }[];

  for (const payload of scriptSeeds) {
    const script = await ensureScript(adminClient, writer.id, payload);
    scripts.push(script);
    console.log(`✔ Script ready → ${payload.title}`);
  }

  const acceptedListingSeed: ListingSeed = {
    title: 'Festival İçin Duygusal Uzun Metraj Aranıyor',
    genre: 'Dram',
    description:
      'Uluslararası festivallerde yarışabilecek, güçlü kadın karakterli bir uzun metraj projesi arıyoruz. Sahil kasabası atmosferi ve dönüşüm hikayesi tercih sebebidir.',
    budget: 750000,
  };

  const acceptedListing = await ensureListing(adminClient, producer.id, acceptedListingSeed);
  console.log(`✔ Listing ready → ${acceptedListingSeed.title}`);

  const acceptedScript = scripts[1] ?? scripts[0];

  const applicationId = await ensureApplication(adminClient, {
    listingId: acceptedListing.id,
    writerId: writer.id,
    scriptId: acceptedScript.id,
    status: 'accepted',
  });
  console.log('✔ Application ready');

  await ensureOrder(adminClient, {
    scriptId: acceptedScript.id,
    buyerId: producer.id,
    amountCents: acceptedScript.price_cents ?? 0,
  });
  console.log('✔ Order ready');

  const conversationId = await ensureConversation(adminClient, applicationId);
  console.log('✔ Conversation ready');

  await ensureConversationParticipant(adminClient, {
    conversationId,
    userId: producer.id,
    role: 'producer',
  });

  await ensureConversationParticipant(adminClient, {
    conversationId,
    userId: writer.id,
    role: 'writer',
  });

  console.log('✔ Conversation participants ready');

  const openListingSeed: ListingSeed = {
    title: 'Belgesel Ortak Yapım İlanı',
    genre: 'Belgesel',
    description:
      'Anadolu’daki arkeolojik keşifler üzerine 45-60 dakikalık bir belgesel için ortak yazar arıyoruz. Hazır senaryo önerilerine açığız.',
    budget: 520000,
  };

  await ensureListing(adminClient, producer.id, openListingSeed);
  console.log(`✔ Listing ready → ${openListingSeed.title}`);

  const now = new Date();
  const firstMessageTime = new Date(now.getTime() - 1000 * 60 * 5).toISOString();
  const secondMessageTime = new Date(now.getTime() - 1000 * 60 * 4).toISOString();

  await ensureMessage(adminClient, {
    conversationId,
    senderId: producer.id,
    body: 'Merhaba! Senaryonuzu okudum ve festival programımıza çok uygun görünüyor. İlk toplantı için bu hafta görüşebilir miyiz?',
    createdAt: firstMessageTime,
  });

  await ensureMessage(adminClient, {
    conversationId,
    senderId: writer.id,
    body: 'Merhaba! İlginize çok sevindim. Çarşamba günü 14:00 sizin için uygun olur mu? Hikayenin revizyon notlarını da paylaşabilirim.',
    createdAt: secondMessageTime,
  });

  console.log('\n✅ MVP demo seed completed.');
  console.log('Login with writer@ducktylo.test / producer@ducktylo.test (password: password).');
}

main().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
