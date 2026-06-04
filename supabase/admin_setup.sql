-- =============================================================================
-- PsiAvalia — Admin Setup
-- Execute no SQL Editor do Supabase (Project → SQL Editor → New Query)
-- =============================================================================

-- 1. Tabela perfis (espelho de auth.users + role)
create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  email       text,
  role        text default 'consultor' check (role in ('admin', 'consultor')),
  ativo       boolean default true,
  crp         text,
  foto_url    text,
  created_at  timestamptz default now()
);

-- 2. RLS na tabela perfis
alter table public.perfis enable row level security;

-- Função auxiliar (security definer evita recursão infinita no RLS)
create or replace function public.minha_role()
returns text language sql security definer stable as $$
  select role from public.perfis where id = auth.uid()
$$;

drop policy if exists "perfis_self"  on public.perfis;
drop policy if exists "perfis_admin_select" on public.perfis;
drop policy if exists "perfis_admin_update" on public.perfis;

create policy "perfis_self"
  on public.perfis for all
  using (id = auth.uid());

create policy "perfis_admin_select"
  on public.perfis for select
  using (public.minha_role() = 'admin');

create policy "perfis_admin_update"
  on public.perfis for update
  using (public.minha_role() = 'admin');

-- 3. Trigger — popula perfis ao criar novo usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare v_count int;
begin
  select count(*) into v_count from public.perfis;
  insert into public.perfis (id, nome, email, role, crp)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    case when v_count = 0 then 'admin' else 'consultor' end,
    new.raw_user_meta_data->>'crp'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Inserir usuários existentes (antes do trigger)
insert into public.perfis (id, nome, email, role, crp)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
  u.email,
  'admin',   -- todos os existentes viram admin; ajuste manualmente se necessário
  u.raw_user_meta_data->>'crp'
from auth.users u
where u.id not in (select id from public.perfis)
on conflict (id) do nothing;

-- 5. Tabela configuracoes
create table if not exists public.configuracoes (
  id                         uuid default gen_random_uuid() primary key,
  admin_id                   uuid references auth.users(id) on delete cascade unique,
  nome_consultoria           text,
  cnpj                       text,
  logo_url                   text,
  slogan                     text,
  email_comercial            text,
  telefone                   text,
  site                       text,
  endereco                   text,
  responsavel_nome           text,
  responsavel_crp            text,
  responsavel_especializacao text,
  nome_sistema               text default 'PsiAvalia',
  cor_primaria               text default '#3a7bd5',
  rodape                     text,
  metodologia                text default 'Este diagnóstico foi elaborado com base no instrumento COPSOQ II (Copenhagen Psychosocial Questionnaire, versão II), adaptado para o contexto brasileiro, em conformidade com os requisitos da NR-01 (Norma Regulamentadora n.º 1 do MTE) sobre gerenciamento de riscos ocupacionais, incluindo os fatores de risco psicossociais.',
  assinatura_url             text,
  updated_at                 timestamptz default now()
);

alter table public.configuracoes enable row level security;

drop policy if exists "config_admin" on public.configuracoes;
create policy "config_admin"
  on public.configuracoes for all
  using (admin_id = auth.uid());

-- 6. Storage buckets — execute separadamente se não existirem
-- insert into storage.buckets (id, name, public) values ('logos',       'logos',       true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('assinaturas', 'assinaturas', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('fotos',       'fotos',       true) on conflict do nothing;
--
-- Ou crie pelo dashboard: Storage → New bucket → marcar "Public bucket"

-- 7. RLS verificação nas tabelas principais
-- As tabelas setores, respostas, riscos, etc. não têm consultor_id direto.
-- O acesso é garantido indiretamente via empresas.consultor_id.
-- Adicione policies como esta (exemplo para riscos):
--
-- create policy "riscos_via_empresa" on public.riscos for all
--   using (
--     setor_id in (
--       select s.id from public.setores s
--       join public.empresas e on e.id = s.empresa_id
--       where e.consultor_id = auth.uid()
--     )
--   );
--
-- Repita o padrão para: diagnosticos, acoes, okrs, key_results, kpis, checklist_itens.
