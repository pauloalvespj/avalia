-- Consolida em uma única tabela: respostas_publicas
-- A tabela "respostas" nunca foi usada no frontend — pode ser dropada

-- 1. Remove tabela redundante
drop table if exists public.respostas cascade;

-- 2. Remove coluna "importada" que só existia para o fluxo de importação
alter table public.respostas_publicas
  drop column if exists importada;

-- 3. Garante que SELECT está aberto para todos os autenticados
--    (já existe resp_pub_select com using(true), mas recria por segurança)
drop policy if exists "resp_pub_select" on public.respostas_publicas;
create policy "resp_pub_select" on public.respostas_publicas
  for select to authenticated using (true);

-- 4. Garante DELETE para consultores donos da empresa
drop policy if exists "resp_pub_delete" on public.respostas_publicas;
create policy "resp_pub_delete" on public.respostas_publicas
  for delete to authenticated
  using (
    empresa_id in (select id from public.empresas where consultor_id = auth.uid())
    or exists (select 1 from public.perfis where id = auth.uid() and role = 'admin')
  );

grant delete on public.respostas_publicas to authenticated;
