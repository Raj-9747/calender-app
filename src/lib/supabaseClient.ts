import { createClient } from "@supabase/supabase-js";

const connectionString = import.meta.env.VITE_SUPABASE_CONNECTION_STRING;
const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const deriveUrlFromConnectionString = (conn?: string): string | undefined => {
  if (!conn) return undefined;
  try {
    const parsed = new URL(conn);
    const hostname = parsed.hostname.replace(/^db\./, "");
    if (!hostname) return undefined;
    return `https://${hostname}`;
  } catch (error) {
    console.warn("Unable to parse VITE_SUPABASE_CONNECTION_STRING:", error);
    return undefined;
  }
};

const supabaseUrl = envSupabaseUrl ?? deriveUrlFromConnectionString(connectionString);

if (!supabaseUrl) {
  const errorMessage = [
    "Missing Supabase URL.",
    "Set VITE_SUPABASE_URL to something like https://<project>.supabase.co,",
    "or provide VITE_SUPABASE_CONNECTION_STRING so it can be inferred automatically.",
  ].join(" ");
  console.error("Supabase Configuration Error:", errorMessage);
  throw new Error(errorMessage);
}

if (!supabaseAnonKey) {
  const errorMessage = "Missing VITE_SUPABASE_ANON_KEY environment variable.";
  console.error("Supabase Configuration Error:", errorMessage);
  throw new Error(errorMessage);
}

// Log configuration in development (not in production for security)
// if (import.meta.env.DEV) {
//   console.log("Supabase configured:", {
//     url: supabaseUrl,
//     hasKey: !!supabaseAnonKey,
//     keyLength: supabaseAnonKey?.length || 0,
//   });
// }

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

