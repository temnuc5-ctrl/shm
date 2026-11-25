-- SHM Rapports — documents générés (modèles PDF sauvegardés)
-- À exécuter dans Supabase → SQL Editor (une seule fois).
--
-- Comme rapport_users, cette table n'est accessible que par le serveur
-- (clé service_role). Aucune policy RLS : la clé anon ne peut rien lire.

create table if not exists public.generated_documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       text        not null,
  template_type text        not null
                check (template_type in ('hierarchy', 'technical', 'proposals', 'custom')),
  name          text        not null,
  content       jsonb       not null,
  url           text,
  category_code text,
  created_at    timestamptz not null default now()
);

-- Si la table existe déjà avec user_id de type uuid, la convertir en text.
alter table public.generated_documents alter column user_id type text using user_id::text;
alter table public.generated_documents add column if not exists url text;
alter table public.generated_documents add column if not exists category_code text;

create index if not exists generated_documents_user_created_idx
  on public.generated_documents (user_id, created_at desc);

alter table public.generated_documents enable row level security;
-- Volontairement AUCUNE policy : accès réservé au service_role (serveur).

-- Bucket public : les PDF sont lisibles via leur URL (nom de fichier = UUID aléatoire).
-- L'écriture et la suppression passent uniquement par le serveur (service_role).
insert into storage.buckets (id, name, public)
values ('generated-documents', 'generated-documents', true)
on conflict (id) do nothing;
