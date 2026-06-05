-- Recria TODAS as políticas da tabela empresas do zero
-- Execute se as empresas sumiram do select/dashboard

-- Remove tudo que existir
drop policy if exists "empresas_owner"  on public.empresas;
drop policy if exists "empresas_select" on public.empresas;
drop policy if exists "empresas_insert" on public.empresas;
drop policy if exists "empresas_update" on public.empresas;
drop policy if exists "empresas_delete" on public.empresas;

-- SELECT: todos os autenticados veem todas as empresas
create policy "empresas_select" on public.empresas
  for select to authenticated
  using (true);

-- INSERT: só o próprio consultor
create policy "empresas_insert" on public.empresas
  for insert to authenticated
  with check (consultor_id = auth.uid());

-- UPDATE: dono ou admin
create policy "empresas_update" on public.empresas
  for update to authenticated
  using (
    consultor_id = auth.uid()
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  )
  with check (
    consultor_id = auth.uid()
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  );

-- DELETE: dono ou admin
create policy "empresas_delete" on public.empresas
  for delete to authenticated
  using (
    consultor_id = auth.uid()
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  );
