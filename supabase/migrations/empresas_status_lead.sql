-- Adiciona status do lead e flag do canal de denúncias à tabela empresas
alter table public.empresas
  add column if not exists status_lead     text default 'lead',
  add column if not exists canal_denuncias boolean default false;
