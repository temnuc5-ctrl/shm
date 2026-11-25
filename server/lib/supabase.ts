import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

let client: SupabaseClient | null = null;

// Le client est créé au premier usage : une variable manquante donne une erreur
// claire sur la route concernée au lieu de faire planter toute la fonction
// (connexion comprise) au chargement du module.
function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Configuration serveur manquante : SUPABASE_URL (ou VITE_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

// Même nom exporté : les routes existantes n'ont pas besoin de changer.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
});

export async function ensureBucketExists(bucketName: string) {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find((b) => b.name === bucketName)) {
      console.log(`Creating bucket: ${bucketName}`);
      const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
      });
      if (error) console.error(`Error creating bucket ${bucketName}:`, error);
    }
  } catch (err) {
    console.error(`Unexpected error checking/creating bucket ${bucketName}:`, err);
  }
}
