-- Adiciona setor_id nas respostas de Clima e NPS para filtros e comparativos por setor
alter table public.clima_respostas add column if not exists setor_id uuid references public.setores(id) on delete set null;
alter table public.nps_respostas   add column if not exists setor_id uuid references public.setores(id) on delete set null;

-- Permite que anonimos leiam setores (para carregar a lista na tela pública)
grant select on public.setores to anon;
