-- SHM Rapports — table des comptes de connexion
-- À exécuter dans Supabase → SQL Editor (une seule fois).
--
-- Le serveur (clé service_role) est le SEUL à lire/écrire cette table.
-- Aucune politique RLS n'est créée : avec RLS activé et aucune policy,
-- la clé anon publique ne peut ni lire ni écrire les comptes ni les hashs.

create extension if not exists pgcrypto;

create table if not exists public.rapport_users (
  id               uuid primary key default gen_random_uuid(),
  first_name       text        not null,
  last_name        text        not null,
  birth_date       date        not null,
  pin_hash         text        not null,
  password_hash    text        not null,
  role             text        not null default 'chef',
  is_active        boolean     not null default true,
  failed_attempts  integer     not null default 0,
  locked_until     timestamptz,
  last_login_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint rapport_users_identity_unique unique (first_name, last_name, birth_date)
);

alter table public.rapport_users enable row level security;
-- Volontairement AUCUNE policy : accès réservé au service_role (serveur).

create index if not exists rapport_users_identity_idx
  on public.rapport_users (lower(first_name), lower(last_name), birth_date);

-- Met à jour updated_at automatiquement.
create or replace function public.rapport_users_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rapport_users_touch on public.rapport_users;
create trigger rapport_users_touch
  before update on public.rapport_users
  for each row execute function public.rapport_users_touch_updated_at();

-- Vérification finale : la table doit apparaître ici.
-- select table_name from information_schema.tables
--  where table_schema = 'public' and table_name = 'rapport_users';
