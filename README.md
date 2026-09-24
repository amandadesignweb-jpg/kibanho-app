# Gestão Kibanho

Sistema interno de gestão para banho e tosa — agenda, financeiro, estoque e
relatórios. React + TypeScript + Tailwind no front, Supabase (Postgres, Auth,
Storage) no backend. Publicado em https://kibanho.netlify.app

## Status — sistema completo (Fases 1 a 3 prontas)

- ✅ Infra: banco Supabase criado e schema completo aplicado (tutores, pets,
  pacotes, agendamentos, procedimentos, financeiro, boletos, estoque,
  configurações), com RLS, índices de performance e bucket de fotos.
- ✅ Login e Dashboard (resumo do dia, cobranças pendentes, boletos vencendo,
  estoque para repor, ações rápidas nos agendamentos).
- ✅ Agenda (semana + dia), Novo Agendamento (avulso/pacote), Registro de
  Procedimento (fotos + anotação + envio por WhatsApp).
- ✅ Clientes & Pets (cadastro rápido) e Ficha do Pet (progresso do pacote,
  histórico de atendimentos).
- ✅ Financeiro completo (entradas/saídas, fluxo de caixa, boletos a pagar).
- ✅ Estoque (produtos em uso, laços) com consumo automático a cada banho
  registrado.
- ✅ Relatórios (banhos, receita, ticket médio, pacotes x avulsos, estoque).
- ✅ Configurações (dados da empresa, tipos de pacote, notificações, conta e
  segurança).

Cada banho registrado em "Registro de Procedimento" dispara, sozinho: o
lançamento financeiro de entrada, o incremento do pacote (se for cliente de
pacote) e o consumo dos produtos de estoque e de um laço. Não é preciso
lançar nada manualmente depois de um atendimento.

## Pontos de atenção para a próxima rodada (não bloqueiam o uso)

- **Ativar proteção de senha vazada** no Supabase: Authentication → Policies
  → Password Security → ative "Leaked password protection". É um toggle,
  1 minuto, recomendado antes de repassar o acesso pra Janaína.
- **"Adiado" em boletos** empurra o vencimento em 7 dias fixos — o ideal é
  trocar por um seletor de data no próprio card, quando fizer sentido.
- **Valor do banho no pacote**: o lançamento de entrada gerado para banhos de
  pacote é R$ 0 (o pacote já foi pago na hora da compra) — os relatórios de
  receita hoje refletem só entradas avulsas. Se quiser refletir um valor
  "amortizado" por banho de pacote nos relatórios, é um ajuste pontual.
- **Notificações em Configurações** (lembrete diário, cobranças pendentes
  etc.) hoje só guardam a preferência — ainda não existe um canal de envio
  (e-mail/push) implementado.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # já vem preenchido com o projeto Supabase do Kibanho
npm run dev
```

## Acesso da Janaína

O app não tem tela de cadastro — é uso interno, de uma pessoa só. Para criar
ou trocar o acesso, direto no Supabase:

1. https://supabase.com/dashboard/project/acbjhzwchcakpcglynni/auth/users
2. **Add user** → **Create new user** → preencha e-mail e senha → marque
   **Auto Confirm User**.

Esse e-mail/senha loga no app. (A própria Janaína também pode trocar e-mail
e senha depois, em Configurações → Conta e segurança.)

## Deploy (Netlify)

Já configurado e publicando sozinho: `github.com/amandadesignweb-jpg/kibanho-app`
→ Netlify (`kibanho`), branch `main`. Qualquer `git push` nessa branch builda
e publica automaticamente — não precisa repetir configuração nenhuma.

Se precisar reconfigurar do zero:
1. Netlify → **Add new site → Import an existing project → GitHub** →
   selecione `kibanho-app` (o `netlify.toml` já traz build e publish).
2. Em **Site settings → Environment variables**:
   - `VITE_SUPABASE_URL` = `https://acbjhzwchcakpcglynni.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (mesma do `.env.example`)
3. Depois de mexer em variáveis de ambiente, é preciso disparar manualmente
   **Trigger deploy → Clear cache and deploy site** — variável de ambiente
   sozinha não builda de novo.

## Estrutura

```
src/
  components/ui/    — componentes reutilizáveis (Card, Chip, Pill, Sidebar, Switch)
                        traduzidos 1:1 da identidade visual dos wireframes
  lib/               — supabase client, auth, helpers de data/boletos/estoque
  pages/             — uma página por rota
  types/database.ts  — tipos das tabelas (schema em supabase/schema.sql)
supabase/schema.sql  — cópia do schema aplicado, para referência/versionamento
```

## Paleta e tokens

Cores extraídas dos wireframes e centralizadas em `tailwind.config.js`
(`blue.*`, `terracota.*`, `ink`, `bg`, `border.*`, `text.*`) — qualquer
ajuste de cor é feito uma vez ali, não espalhado pelas telas.
