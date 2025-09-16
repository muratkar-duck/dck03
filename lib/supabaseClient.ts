// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://grjycoovcdjapnpbrgao.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyanljb292Y2RqYXBucGJyZ2FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3OTY1MjMsImV4cCI6MjA2OTM3MjUyM30.M8ewcmp--gVDIbaVjybvScrF7ck74swFAA_LEWf12x8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
