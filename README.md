# P.S.I. Guard™ — React + Supabase

Sistema de diagnóstico psicossocial (NR-1) para consultorias de RH/SST.
Construído com Vite + React + Tailwind + Supabase.

---

## Pré-requisitos

- Node.js 18+ (verifique com `node --version`)
- Conta no Supabase (supabase.com)
- Claude Code instalado (`curl -fsSL https://claude.ai/install.sh | bash`)

---

## PASSO 1 — Supabase

1. Crie um projeto em **supabase.com** → New project
   - Nome: `psi-guard` | Region: South America (São Paulo)
2. **SQL Editor → New query** → cole o conteúdo de `supabase/schema.sql` → Run
3. **Authentication → Providers** → Email ligado, "Confirm email" desligado (p/ testes)
4. **Authentication → Users → Add user** → crie o primeiro consultor
5. **Project Settings → API** → anote:
   - Project URL
   - anon public key

---

## PASSO 2 — Configurar credenciais

```bash
cp .env.example .env.local
```
Edite `.env.local` e preencha:
```
VITE_SUPABASE_URL=https://SEU_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## PASSO 3 — Instalar dependências e rodar

```bash
npm install
npm run dev
```
Acesse `http://localhost:5173`. Faça login com o usuário criado no Passo 1.

---

## PASSO 4 — Implementar as páginas com Claude Code

```bash
claude
```
O Claude Code lê o `CLAUDE.md` automaticamente. Mande um passo de cada vez:

```
Implemente o Passo 1 do CLAUDE.md (completar EmpresasPage com os campos faltantes e contexto de empresa ativa).
```
Teste. Depois:
```
Implemente o Passo 2 do CLAUDE.md (SetoresPage com CRUD e geração de link/QR Code).
```
Siga assim até o Passo 10. Se der erro, cole a mensagem e peça para corrigir.

---

## PASSO 5 — Build e deploy na Hostinger

```bash
npm run build
```
Isso gera a pasta `dist/` com os arquivos estáticos.

Na Hostinger (hPanel):
1. **Domínios → Subdomínios** → crie `psi.integra.com.br` (ou o nome que quiser)
2. **Arquivos → Gerenciador de Arquivos** → entre na pasta do subdomínio
3. Faça upload do ZIP da pasta `dist/` e extraia
4. Crie (ou edite) o arquivo `.htaccess` na raiz do subdomínio com o conteúdo abaixo

### `.htaccess` necessário para React Router funcionar

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
```
Sem isso, ao acessar `/dashboard` diretamente o servidor retorna 404.

---

## Estrutura do projeto

```
psi-guard-react/
├── src/
│   ├── App.jsx              ← roteamento
│   ├── main.jsx             ← entrada
│   ├── index.css            ← Tailwind + classes globais
│   ├── lib/supabase.js      ← cliente Supabase
│   ├── hooks/useAuth.jsx    ← contexto de autenticação
│   ├── components/
│   │   ├── layout/Layout.jsx  ← sidebar + topbar
│   │   └── ui/index.jsx       ← componentes reutilizáveis
│   └── pages/               ← uma página por rota
├── supabase/schema.sql      ← esquema do banco
├── referencia/              ← HTML original (referência de lógica)
├── CLAUDE.md                ← instruções para o Claude Code
├── .env.example             ← template de credenciais
└── README.md
```

---

## Páginas e status

| Rota           | Página            | Status         |
|----------------|-------------------|----------------|
| /login         | LoginPage         | ✅ Pronto      |
| /questionario  | QuestionarioPage  | ✅ Pronto      |
| /dashboard     | DashboardPage     | 🔧 Esqueleto   |
| /empresas      | EmpresasPage      | 🔧 CRUD básico |
| /setores       | SetoresPage       | 🔧 Esqueleto   |
| /respostas     | RespostasPage     | 🔧 Esqueleto   |
| /riscos        | RiscosPage        | 🔧 Esqueleto   |
| /diagnostico   | DiagnosticoPage   | 🔧 Esqueleto   |
| /plano-acao    | PlanoAcaoPage     | 🔧 Esqueleto   |
| /okrs          | OkrsPage          | 🔧 Esqueleto   |
| /checklist     | ChecklistPage     | 🔧 Esqueleto   |
| /relatorio     | RelatorioPage     | 🔧 Esqueleto   |
