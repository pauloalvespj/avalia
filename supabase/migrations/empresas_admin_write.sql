-- Admins podem alterar/excluir qualquer empresa

drop policy if exists "empresas_update" on public.empresas;
drop policy if exists "empresas_delete" on public.empresas;

-- UPDATE: dono da empresa OU admin
create policy "empresas_update" on public.empresas
  for update to authenticated
  using (
    consultor_id = auth.uid()
    or exists (
      select 1 from public.perfis
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    consultor_id = auth.uid()
    or exists (
      select 1 from public.perfis
      where id = auth.uid() and role = 'admin'
    )
  );

-- DELETE: dono da empresa OU admin
create policy "empresas_delete" on public.empresas
  for delete to authenticated
  using (
    consultor_id = auth.uid()
    or exists (
      select 1 from public.perfis
      where id = auth.uid() and role = 'admin'
    )
  );
