#!/usr/bin/env node
/**
 * Création d'un compte de connexion pour le portail Rapports.
 *
 * Prérequis : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans l'environnement
 * (ou dans .env), et la table `rapport_users` créée (supabase/AUTH.sql).
 *
 * Usage :
 *   node scripts/create-user.mjs --first Adnane --last Bennani \
 *        --birth 1990-05-12 --pin 1234 --password "motdepasse" [--role chef]
 *
 * Le mot de passe et le PIN sont hachés en bcrypt (12 tours) : rien n'est
 * stocké en clair, ni dans la base, ni dans le dépôt.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const get = (name, fallback = "") => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const firstName = get("first").trim();
const lastName = get("last").trim();
const birthDate = get("birth").trim();
const pin = get("pin").trim();
const password = get("password");
const role = get("role", "chef").trim() || "chef";

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

if (!firstName || !lastName || !birthDate || !pin || !password) {
  fail('Arguments requis : --first --last --birth YYYY-MM-DD --pin --password [--role chef]');
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) fail("La date de naissance doit être au format YYYY-MM-DD.");
if (!/^\d{4,8}$/.test(pin)) fail("Le PIN doit contenir 4 à 8 chiffres.");
if (password.length < 8) fail("Le mot de passe doit contenir au moins 8 caractères.");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const [pinHash, passwordHash] = await Promise.all([
  bcrypt.hash(pin, 12),
  bcrypt.hash(password, 12),
]);

const { data, error } = await supabase
  .from("rapport_users")
  .upsert(
    {
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      pin_hash: pinHash,
      password_hash: passwordHash,
      role,
      is_active: true,
      failed_attempts: 0,
      locked_until: null,
    },
    { onConflict: "first_name,last_name,birth_date" },
  )
  .select("id, first_name, last_name, birth_date, role")
  .single();

if (error) fail(`Supabase : ${error.message}`);

console.log("✓ Compte créé / mis à jour :");
console.log(`  ${data.first_name} ${data.last_name} — ${data.birth_date} — rôle ${data.role}`);
console.log(`  id : ${data.id}`);
