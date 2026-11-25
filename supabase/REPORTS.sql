-- SHM Rapports — catégorie ciblée des rapports (colonne additive, nullable).
-- À exécuter dans Supabase → SQL Editor. Les rapports existants restent valides (category_code = null).

alter table public.reports add column if not exists category_code text;

create index if not exists reports_category_code_idx on public.reports (category_code);
