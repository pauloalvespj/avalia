-- Migração: okrs passa a ser por empresa (não por setor)
-- kpis permanece por setor (sem alteração estrutural)
-- Execute no SQL Editor do Supabase

-- ── 1. okrs: adicionar empresa_id ────────────────────────────────────────────
alter table public.okrs
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;

-- ── 2. Migrar dados existentes ───────────────────────────────────────────────
update public.okrs o
set empresa_id = s.empresa_id
from public.setores s
where o.setor_id = s.id
  and o.empresa_id is null;

-- ── 3. Remover órfãos ────────────────────────────────────────────────────────
delete from public.okrs where empresa_id is null;

-- ── 4. Tornar empresa_id obrigatório ─────────────────────────────────────────
alter table public.okrs alter column empresa_id set not null;

-- ── 5. Remover políticas antigas que referenciam setor_id ───────────────────
drop policy if exists "okrs_owner"  on public.okrs;
drop policy if exists "okrs_select" on public.okrs;
drop policy if exists "okrs_insert" on public.okrs;
drop policy if exists "okrs_update" on public.okrs;
drop policy if exists "okrs_delete" on public.okrs;

drop policy if exists "kr_owner"  on public.key_results;
drop policy if exists "kr_select" on public.key_results;
drop policy if exists "kr_insert" on public.key_results;
drop policy if exists "kr_update" on public.key_results;
drop policy if exists "kr_delete" on public.key_results;

-- ── 6. Remover setor_id de okrs (sem dependências agora) ─────────────────────
alter table public.okrs drop column if exists setor_id;

-- ── 7. Nova política para okrs (direto por empresa) ──────────────────────────
create policy "okrs_owner" on public.okrs
  for all
  using (empresa_id in (select id from public.empresas where consultor_id = auth.uid()))
  with check (empresa_id in (select id from public.empresas where consultor_id = auth.uid()));

-- ── 8. Nova política para key_results (via okr → empresa) ───────────────────
create policy "kr_owner" on public.key_results
  for all
  using (
    okr_id in (
      select id from public.okrs
      where empresa_id in (select id from public.empresas where consultor_id = auth.uid())
    )
  )
  with check (
    okr_id in (
      select id from public.okrs
      where empresa_id in (select id from public.empresas where consultor_id = auth.uid())
    )
  );

-- ── 9. Índice ────────────────────────────────────────────────────────────────
create index if not exists idx_okrs_empresa on public.okrs (empresa_id);
