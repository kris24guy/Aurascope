-- Supabase schema for AuraScope full-spectrum + Resend webhooks
create table if not exists resend_events (
  svix_id text primary key,
  type text not null,
  email_id text,
  from_email text,
  to_email text,
  subject text,
  payload jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_resend_events_type on resend_events(type);
create index if not exists idx_resend_events_email_id on resend_events(email_id);

create table if not exists aura_emails (
  email_id text primary key,
  from_email text,
  to_email text,
  subject text,
  last_event_type text,
  last_event_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists aura_contacts (
  contact_id text primary key,
  email text,
  last_event_type text,
  payload jsonb,
  updated_at timestamptz default now()
);

create table if not exists aura_domains (
  domain_id text primary key,
  name text,
  last_event_type text,
  status text,
  payload jsonb,
  updated_at timestamptz default now()
);

create table if not exists aura_readings (
  id uuid primary key default gen_random_uuid(),
  birth_month int not null,
  birth_day int not null,
  birth_year int not null,
  time_opt text,
  location text,
  inner_hue jsonb,
  outer_hue jsonb,
  spectrum jsonb,
  blended_middle jsonb,
  created_at timestamptz default now()
);

create table if not exists aura_spectrum (
  day_of_year int primary key,
  family text not null,
  dark_code int not null,
  base_code int not null,
  light_code int not null,
  dark_name text,
  base_name text,
  light_name text,
  dark_emotion text,
  base_emotion text,
  light_emotion text
);

alter table resend_events enable row level security;
alter table aura_emails enable row level security;
alter table aura_contacts enable row level security;
alter table aura_domains enable row level security;
alter table aura_readings enable row level security;
alter table aura_spectrum enable row level security;

create policy "service role all" on resend_events for all using (true) with check (true);
create policy "service role all" on aura_emails for all using (true) with check (true);
create policy "service role all" on aura_contacts for all using (true) with check (true);
create policy "service role all" on aura_domains for all using (true) with check (true);
create policy "service role all" on aura_readings for all using (true) with check (true);
create policy "service role all" on aura_spectrum for all using (true) with check (true);
create policy "anon read spectrum" on aura_spectrum for select using (true);
create policy "anon read readings" on aura_readings for select using (true);
