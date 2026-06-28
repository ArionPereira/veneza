import { createClient } from "@supabase/supabase-js";

export const CHAVE = window.CHAVE;
export const sb    = createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
