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
- ✅ Agenda (semana + dia), Novo Agendamento (pet cadastrado ou cadastro de
  pet novo na mesma tela; Avulso ou Pacote mensal/quinzenal — pacote novo já
  agenda automaticamente os próximos atendimentos, editáveis um a um antes de
  confirmar; forma de pagamento pix/crédito/débito/dinheiro ou "cobrar
  depois"), Registro de Procedimento (fotos — mínimo 1 obrigatório — +
  anotação + envio por WhatsApp).
- ✅ Clientes & Pets (cadastro rápido em pop-up centralizado) e Ficha do Pet
  (progresso do pacote, histórico de atendimentos).
- ✅ Financeiro completo (entradas/saídas, fluxo de caixa, boletos a pagar com
  data de vencimento editável no "Adiado", exportação em CSV).
- ✅ Estoque (produtos em uso, laços) com consumo automático a cada banho
  registrado.
- ✅ Relatórios (banhos, receita, ticket médio, serviços mais realizados —
  Banho / Banho + tosa / Tosa higiênica —, % de clientes com pacote, estoque).
- ✅ Configurações (dados da empresa, tipos de pacote — agora editáveis e
  excluíveis —, notificações, conta e segurança).

Cada banho registrado em "Registro de Procedimento" dispara, sozinho: o
lançamento financeiro de entrada, o incremento do pacote (se for cliente de
pacote) e o consumo dos produtos de estoque e de um laço. Não é preciso
lançar nada manualmente depois de um atendimento.

## Pontos de atenção para a próxima rodada (não bloqueiam o uso)

- **Cadência do pacote automático**: quando cria um pacote mensal ou
  quinzenal novo em "Novo agendamento", o sistema agenda sozinho os próximos
  atendimentos a cada 7 dias (mensal) ou 15 dias (quinzenal), a partir da
  primeira data escolhida, usando a quantidade de banhos configurada em
  Configurações → Tipos de pacote. É uma interpretação minha de "agendar
  automaticamente os próximos atendimentos" — as datas/horários geradas
  ficam editáveis na tela antes de confirmar, mas vale validar com a
  Janaína se a cadência (semanal/quinzenal) é mesmo essa.
- **"Erro que impedia salvar o banho"**: não consegui reproduzir o erro nem
  achar uma causa confirmada nos logs do Supabase. O que fiz foi reforçar o
  fluxo — agora toda escrita (foto, procedimento, status do agendamento,
  lançamento financeiro) checa o erro de verdade e mostra uma mensagem
  específica em vez de falhar quieto, saneei os nomes de arquivo de foto
  (fotos de celular às vezes vêm com espaço/acento, o que podia rejeitar o
  upload) e passei a exigir pelo menos 1 foto antes de liberar o Salvar. Se
  o erro voltar a acontecer, a mensagem que aparecer na tela agora vai dizer
  exatamente onde falhou — me manda ela que eu já sigo direto pra causa.
- **Ativar proteção de senha vazada** no Supabase: Authentication → Policies
  → Password Security → ative "Leaked password protection". É um toggle,
  1 minuto, recomendado antes de repassar o acesso pra Janaína.
- **Valor do banho no pacote**: o lançamento de entrada gerado para banhos de
  pacote é R$ 0 (o pacote já foi pago na hora da compra) — os relatórios de
  receita hoje refletem só entradas avulsas. Se quiser refletir um valor
  "amortizado" por banho de pacote nos relatórios, é um ajuste pontual.
- **Notificações em Configurações** (lembrete diário, cobranças pendentes
  etc.) hoje só guardam a preferência — ainda não existe um canal de envio
  (e-mail/push) implementado.
- **Consumo de estoque**: todo banho registrado consome automaticamente todos
  os produtos em uso (shampoo, condicionador etc.) e um laço, e o alerta de
  reposição é calculado por contagem de banhos (20 = repor em breve, 30 =
  repor agora — ajustável em `src/lib/estoque.ts`). É uma regra que criei pra
  fazer os números se moverem sozinhos; vale validar com a Janaína se bate
  com o consumo real do salão (nem todo pet usa todos os produtos).

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
