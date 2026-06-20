-- Renomear tabelas do Módulo NR-1
-- Execute este script no SQL Editor do Supabase

alter table public.perguntas_customizadas      rename to nr1_perguntas;
alter table public.respostas_publicas          rename to nr1_respostas;
alter table public.riscos                      rename to nr1_riscos;
alter table public.escutas_equipe_eixos        rename to nr1_escutas_equipe_eixos;
alter table public.escutas_equipe              rename to nr1_escutas_equipe;
alter table public.entrevistas_gestores_blocos rename to nr1_entrevistas_gestores_blocos;
alter table public.entrevistas_gestores        rename to nr1_entrevistas_gestores;
