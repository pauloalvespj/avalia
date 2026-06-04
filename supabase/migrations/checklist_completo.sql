-- Migração completa: checklist_itens por empresa
-- Execute TUDO de uma vez no SQL Editor do Supabase

-- 1. Adicionar colunas novas
alter table public.checklist_itens
  add column if not exists empresa_id      uuid references public.empresas(id) on delete cascade,
  add column if not exists fase            int  default 0,
  add column if not exists semana_prevista text,
  add column if not exists observacao      text,
  add column if not exists created_at      timestamptz default now();

-- 2. Migrar dados existentes (preenche empresa_id a partir do setor)
update public.checklist_itens ci
set empresa_id = s.empresa_id
from public.setores s
where ci.setor_id = s.id
  and ci.empresa_id is null;

-- 3. Remover linhas sem empresa (órfãos)
delete from public.checklist_itens where empresa_id is null;

-- 4. Tornar empresa_id obrigatório
alter table public.checklist_itens
  alter column empresa_id set not null;

-- 6. Remover todas as políticas antigas (qualquer nome)
drop policy if exists "checklist_itens_owner"  on public.checklist_itens;
drop policy if exists "checklist_itens_select" on public.checklist_itens;
drop policy if exists "checklist_itens_insert" on public.checklist_itens;
drop policy if exists "checklist_itens_update" on public.checklist_itens;
drop policy if exists "checklist_itens_delete" on public.checklist_itens;
drop policy if exists "checklist_select"       on public.checklist_itens;
drop policy if exists "checklist_insert"       on public.checklist_itens;
drop policy if exists "checklist_update"       on public.checklist_itens;
drop policy if exists "checklist_delete"       on public.checklist_itens;

-- 7. Agora remove setor_id (sem dependências)
alter table public.checklist_itens
  drop column if exists setor_id;

-- 8. Criar política correta (todas as operações via empresa → consultor)
create policy "checklist_itens_owner" on public.checklist_itens
  for all
  using (
    empresa_id in (
      select id from public.empresas where consultor_id = auth.uid()
    )
  )
  with check (
    empresa_id in (
      select id from public.empresas where consultor_id = auth.uid()
    )
  );

-- 9. Índice para queries por empresa
create index if not exists idx_checklist_empresa on public.checklist_itens (empresa_id);
