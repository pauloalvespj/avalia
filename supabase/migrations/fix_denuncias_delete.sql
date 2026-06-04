-- Adiciona política e permissão de DELETE na tabela denuncias
create policy "denuncia_delete_consultor" on public.denuncias
  for delete to authenticated
  using (empresa_id in (
    select id from public.empresas where consultor_id = auth.uid()
  ));

grant delete on public.denuncias to authenticated;
