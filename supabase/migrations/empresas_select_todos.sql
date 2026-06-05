-- Todos os usuários autenticados podem VER todas as empresas
-- mas só o dono pode criar/editar/excluir as suas

drop policy if exists "empresas_owner" on public.empresas;

-- SELECT: qualquer usuário autenticado vê todas
create policy "empresas_select" on public.empresas
  for select to authenticated
  using (true);

-- INSERT: só o próprio consultor insere
create policy "empresas_insert" on public.empresas
  for insert to authenticated
  with check (consultor_id = auth.uid());

-- UPDATE/DELETE: só o dono
create policy "empresas_update" on public.empresas
  for update to authenticated
  using (consultor_id = auth.uid())
  with check (consultor_id = auth.uid());

create policy "empresas_delete" on public.empresas
  for delete to authenticated
  using (consultor_id = auth.uid());
