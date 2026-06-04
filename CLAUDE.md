# P.S.I. Guard™ — Instruções para o Claude Code

Leia tudo antes de editar qualquer arquivo.

## O que é este projeto

Sistema de diagnóstico psicossocial (NR-1) para consultorias de RH/SST.
Stack: **React + Vite + Tailwind + Supabase** (JS, não TypeScript).

Dois módulos:
- **App do consultor** — SPA com login, roteada via React Router (`src/App.jsx`)
- **Questionário público** — `src/pages/QuestionarioPage.jsx`, sem login, acessado
  por funcionários via link com params `?empresa=UUID&setor=UUID`

O arquivo `referencia/app_consultor.html` é o sistema original (HTML/JS puro).
Ele serve como **fonte de verdade da lógica de negócio**: algoritmos de cálculo
de risco, estrutura dos dados, regras de scoring. Leia-o ao implementar cada página.

## Estrutura de arquivos

```
src/
├── App.jsx                    ← roteamento (não altere as rotas)
├── main.jsx                   ← entrada (não altere)
├── index.css                  ← Tailwind + classes utilitárias globais
├── lib/supabase.js            ← cliente Supabase (não altere)
├── hooks/useAuth.jsx          ← contexto de autenticação (não altere)
├── components/
│   ├── layout/Layout.jsx      ← sidebar + topbar (pode melhorar visual)
│   └── ui/index.jsx           ← Toast, Modal, PageHeader, StatCard, etc.
└── pages/                     ← uma página por rota (IMPLEMENTE AQUI)
    ├── LoginPage.jsx          ← PRONTO
    ├── QuestionarioPage.jsx   ← PRONTO (questionário público, 41 perguntas)
    ├── DashboardPage.jsx      ← esqueleto — implementar
    ├── EmpresasPage.jsx       ← CRUD básico pronto — completar campos
    └── [demais páginas]       ← esqueleto com TODO — implementar
```

## Tabelas do banco (Supabase)

```
empresas          → id, consultor_id, nome, cnpj, setor_ramo, func_total, ...
setores           → id, empresa_id, nome, func_setor
respostas_publicas → id, empresa_id, setor_id, respostas(jsonb), importada
respostas         → id, setor_id, resposta_publica_id, respostas(jsonb)
riscos            → id, setor_id, fator, score, nivel, evidencias
diagnosticos      → id, setor_id, sintese, riscos_txt, protetores, recomendacoes, conclusao
acoes             → id, setor_id, consultor_id, descricao, responsavel, prazo, prioridade, status
okrs              → id, setor_id, objetivo, prazo
key_results       → id, okr_id, texto, progresso
kpis              → id, setor_id, nome, baseline, atual, meta
checklist_itens   → id, setor_id, texto, concluido, ordem
```

RLS ativo: cada consultor só acessa dados das suas empresas.
A `anon key` (já no `.env.local`) é pública por design — nunca use `service_role`.

## Como trabalhar (regras obrigatórias)

1. **Um passo de cada vez.** Implemente uma página, peça para eu testar,
   só depois avance. Não faça múltiplas páginas em uma tacada.

2. **Sempre use o cliente Supabase** de `@/lib/supabase`. Nunca crie outro.

3. **Consulte o referencia/app_consultor.html** antes de implementar lógica
   de negócio. A lógica de cálculo de riscos está na função `calcularRiscos()`.

4. **Use as classes do Tailwind e as globais** definidas em `src/index.css`:
   `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.label`, `.badge-*`.
   Não crie estilos inline quando existir classe utilitária disponível.

5. **Reutilize os componentes de UI**: `Toast`, `Modal`, `PageHeader`,
   `StatCard`, `EmptyState`, `LoadingSpinner`, `ConfirmModal` de
   `@/components/ui`.

6. **Explique em português** o que cada bloco de código faz.

7. **Trate erros** de todas as chamadas ao Supabase. Exiba mensagens
   amigáveis em português via `Toast`.

## Ordem sugerida de implementação

### Passo 1 — EmpresasPage (completar)
Já tem o CRUD básico. Adicionar:
- Campos faltantes no formulário: data_inicio, responsavel, contato, demanda,
  historico, turnover, atestados, rh.
- Ao clicar "Abrir →" numa empresa, salvar a empresa ativa em contexto/estado
  global (pode usar React Context ou localStorage) para uso nas demais páginas.

### Passo 2 — SetoresPage
- Listar setores da empresa ativa
- CRUD: criar (nome, func_setor), editar, deletar
- Botão "🔗 Gerar link / QR Code":
  link = `${window.location.origin}/questionario?empresa=<empresa_id>&setor=<setor_id>`
  Exibir link + QR Code (use `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=URL`)

### Passo 3 — RespostasPage
- Listar respostas importadas do setor ativo
- Botão "🔄 Sincronizar": buscar `respostas_publicas` onde `setor_id = setor_ativo`
  e `importada = false`, inserir na tabela `respostas`, marcar `importada = true`
- Exibir contagem e tabela com data e preview
- Botão deletar resposta individual

### Passo 4 — RiscosPage
- Lógica de cálculo: ler `respostas` do setor, calcular score por subfator (sf1..sf28)
  agrupados em fatores (blocos 1-7). Ver `calcularRiscos()` no referencia/ HTML.
- Score = média das respostas; para perguntas com `inv:true`, inverter (6 - valor).
- Nível: score ≤ 2 = baixo, ≤ 3 = médio, ≤ 4 = alto, > 4 = crítico.
- Salvar/atualizar na tabela `riscos`.
- Exibir cards por fator com badge colorido pelo nível.

### Passo 5 — DiagnosticoPage
- Formulário com os campos de texto do diagnóstico (sintese, riscos_txt, protetores,
  recomendacoes, conclusao). Auto-save com debounce de 1s.

### Passo 6 — PlanoAcaoPage
- CRUD de ações com filtros por status e prioridade.
- Cards com badge de prioridade e dropdown de status.

### Passo 7 — OkrsPage
- CRUD de OKRs com seus Key Results (progresso em %).
- Abaixo, tabela editável de KPIs (baseline, atual, meta).
  Seed com os 6 KPIs padrão se setor não tiver nenhum.

### Passo 8 — ChecklistPage
- Lista de itens com checkbox. Itens padrão na criação do setor.
- Adicionar/remover itens personalizados.

### Passo 9 — RelatorioPage
- Montar relatório consolidado: empresa, setores, riscos, diagnóstico, plano, OKRs.
- Botão "Imprimir / Salvar PDF" com `window.print()`.
- Estilos de impressão via `@media print` no CSS.

### Passo 10 — DashboardPage (completar)
- Métricas reais: total de empresas, respostas pendentes de importação,
  ações abertas/concluídas.
- Gráfico de riscos por nível usando Recharts (já instalado).
