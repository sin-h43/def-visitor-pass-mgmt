import { createClient } from "@supabase/supabase-js";

console.log("ENV:", import.meta.env);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("URL:", supabaseUrl);
console.log("KEY:", supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!
);