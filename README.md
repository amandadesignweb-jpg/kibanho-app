# Gestão Kibanho

Sistema interno de gestão para banho e tosa — agenda, financeiro, estoque e
relatórios. React + TypeScript + Tailwind no front, Supabase (Postgres, Auth,
Storage) no backend.

## Status

- ✅ Infra: banco Supabase criado e schema completo aplicado (tutores, pets,
  pacotes, agendamentos, procedimentos, financeiro, boletos, estoque,
  configurações), com RLS e bucket de fotos.
- ✅ Fase 1 (em andamento): Login e Dashboard já funcionam com dados reais.
  Agenda, Ficha do Pet, Novo Agendamento e Registro de Procedimento ainda
  mostram uma tela "em construção" — próximos da fila.
- ⏳ Fase 2 (Financeiro completo) e Fase 3 (Estoque, Relatórios,
  Configurações) — ainda não iniciadas.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # já vem preenchido com o projeto Supabase do Kibanho
npm run dev
```

## Criar o primeiro acesso (Janaína)

O app não tem tela de cadastro — é uso interno, de uma pessoa só. Crie o
acesso direto no Supabase:

1. https://supabase.com/dashboard/project/acbjhzwchcakpcglynni/auth/users
2. **Add user** → **Create new user** → preencha e-mail e senha → marque
   **Auto Confirm User**.

Pronto, esse e-mail/senha já loga no app.

## Deploy (Netlify)

1. Suba este repositório no GitHub (veja instruções que te mandei no chat).
2. No Netlify: **Add new site → Import an existing project → GitHub** →
   selecione `kibanho-app`. O `netlify.toml` já configura build e publish.
3. Em **Site settings → Environment variables**, cadastre:
   - `VITE_SUPABASE_URL` = `https://acbjhzwchcakpcglynni.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (mesma do `.env.example`)
4. Deploy. A cada novo `git push` na branch `main`, o Netlify builda e
   publica sozinho — não precisa repetir esse passo.

## Estrutura

```
src/
  components/ui/    — componentes reutilizáveis (Card, Chip, Pill, Sidebar)
                        traduzidos 1:1 da identidade visual dos wireframes
  lib/               — supabase client, auth, helpers de data/boletos
  pages/             — uma página por rota
  types/database.ts  — tipos das tabelas (schema em supabase/schema.sql)
supabase/schema.sql  — cópia do schema aplicado, para referência/versionamento
```

## Paleta e tokens

Cores extraídas dos wireframes e centralizadas em `tailwind.config.js`
(`brand`-like tokens: `blue.*`, `terracota.*`, `ink`, `bg`, `border.*`,
`text.*`) — qualquer ajuste de cor é feito uma vez ali, não espalhado pelas
telas.
