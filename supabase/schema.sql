-- ==========================================================
-- Gestão Kibanho — schema aplicado no projeto Supabase
-- (gestao-kibanho, ref acbjhzwchcakpcglynni, sa-east-1)
-- Cópia de referência — a fonte da verdade é o próprio banco.
-- Para novas mudanças, use `mcp__Supabase__apply_migration` e depois
-- atualize este arquivo para manter o histórico legível no repositório.
-- ==========================================================

create extension if not exists "pgcrypto";

create table tutores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  endereco text,
  created_at timestamptz not null default now()
);

create table tipos_pacote (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(10,2) not null,
  banhos_por_ciclo int not null default 1,
  created_at timestamptz not null default now()
);

create table pets (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references tutores(id) on delete cascade,
  nome text not null,
  especie text not null default 'cão',
  raca text,
  observacoes text,
  foto_url text,
  created_at timestamptz not null default now()
);

create table pacotes_pet (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  tipo_pacote_id uuid not null references tipos_pacote(id),
  data_inicio date not null default current_date,
  banhos_usados_ciclo int not null default 0,
  status text not null default 'ativo' check (status in ('ativo','encerrado')),
  created_at timestamptz not null default now()
);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  tipo_servico text not null check (tipo_servico in ('avulso','pacote')),
  data date not null,
  hora time not null,
  status text not null default 'confirmado' check (status in ('confirmado','realizado','remarcado','nao_realizado','cancelado')),
  pagamento_status text not null default 'pago' check (pagamento_status in ('pago','pendente')),
  valor numeric(10,2),
  created_at timestamptz not null default now()
);

create table procedimentos (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references agendamentos(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  data date not null default current_date,
  fotos jsonb not null default '[]'::jsonb,
  anotacao_tutor text,
  enviado_whatsapp boolean not null default false,
  created_at timestamptz not null default now()
);

create table financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida')),
  descricao text not null,
  categoria text,
  valor numeric(10,2) not null,
  data date not null default current_date,
  status_pagamento text not null default 'pago' check (status_pagamento in ('pago','pendente')),
  agendamento_id uuid references agendamentos(id) on delete set null,
  boleto_id uuid,
  created_at timestamptz not null default now()
);

create table boletos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  valor numeric(10,2) not null,
  data_vencimento date not null,
  recorrente boolean not null default false,
  status text not null default 'em_dia' check (status in ('em_dia','atencao','atrasado','pago','adiado')),
  lancamento_id uuid references financeiro_lancamentos(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table financeiro_lancamentos
  add constraint financeiro_lancamentos_boleto_fk
  foreign key (boleto_id) references boletos(id) on delete set null;

create table estoque_produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_abertura date not null default current_date,
  data_fim date,
  banhos_realizados int not null default 0,
  status text not null default 'em_uso' check (status in ('em_uso','repor_em_breve','repor_agora','encerrado')),
  created_at timestamptz not null default now()
);

create table estoque_lacos (
  id uuid primary key default gen_random_uuid(),
  quantidade_comprada int not null,
  quantidade_usada int not null default 0,
  data_registro date not null default current_date,
  created_at timestamptz not null default now()
);

create table configuracoes (
  id int primary key default 1,
  empresa_nome text not null default 'Kibanho',
  responsavel text,
  telefone text,
  instagram text,
  endereco text,
  notif_lembrete_diario boolean not null default true,
  notif_cobrancas_pendentes boolean not null default true,
  notif_renovacao_pacote boolean not null default true,
  notif_alerta_estoque boolean not null default true,
  backup_automatico boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);
insert into configuracoes (id) values (1);

alter table tutores enable row level security;
alter table tipos_pacote enable row level security;
alter table pets enable row level security;
alter table pacotes_pet enable row level security;
alter table agendamentos enable row level security;
alter table procedimentos enable row level security;
alter table financeiro_lancamentos enable row level security;
alter table boletos enable row level security;
alter table estoque_produtos enable row level security;
alter table estoque_lacos enable row level security;
alter table configuracoes enable row level security;

create policy "authenticated_full_access" on tutores for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on tipos_pacote for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on pets for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on pacotes_pet for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on agendamentos for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on procedimentos for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on financeiro_lancamentos for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on boletos for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on estoque_produtos for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on estoque_lacos for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on configuracoes for all to authenticated using (true) with check (true);

insert into tipos_pacote (nome, valor, banhos_por_ciclo) values
  ('Mensal', 240.00, 4),
  ('Quinzenal', 130.00, 2),
  ('Avulso', 70.00, 1);

-- Índices de performance (cobertura de foreign keys + consultas mais comuns)
create index if not exists idx_agendamentos_pet_id on agendamentos(pet_id);
create index if not exists idx_boletos_lancamento_id on boletos(lancamento_id);
create index if not exists idx_financeiro_lancamentos_agendamento_id on financeiro_lancamentos(agendamento_id);
create index if not exists idx_financeiro_lancamentos_boleto_id on financeiro_lancamentos(boleto_id);
create index if not exists idx_pacotes_pet_pet_id on pacotes_pet(pet_id);
create index if not exists idx_pacotes_pet_tipo_pacote_id on pacotes_pet(tipo_pacote_id);
create index if not exists idx_pets_tutor_id on pets(tutor_id);
create index if not exists idx_procedimentos_agendamento_id on procedimentos(agendamento_id);
create index if not exists idx_procedimentos_pet_id on procedimentos(pet_id);
create index if not exists idx_agendamentos_data on agendamentos(data);
create index if not exists idx_financeiro_lancamentos_data on financeiro_lancamentos(data);
create index if not exists idx_boletos_status on boletos(status);

-- Storage
insert into storage.buckets (id, name, public)
values ('fotos-kibanho', 'fotos-kibanho', true)
on conflict (id) do nothing;

create policy "authenticated_upload_fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-kibanho');

create policy "authenticated_manage_fotos" on storage.objects
  for all to authenticated
  using (bucket_id = 'fotos-kibanho')
  with check (bucket_id = 'fotos-kibanho');

create policy "public_read_fotos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'fotos-kibanho');
