-- ── NestList Database Schema ──────────────────────────────────────────────────
-- Run this in Supabase SQL Editor to create all tables
-- Project: nestlist

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id           text primary key, -- Clerk user ID
  full_name    text,
  phone        text,
  email        text,
  role         text check (role in ('landlord','caretaker','agent','tenant','admin','superadmin')),
  avatar_url   text,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Properties ────────────────────────────────────────────────────────────────
create table if not exists properties (
  id           uuid primary key default uuid_generate_v4(),
  landlord_id  text references profiles(id) on delete cascade,
  title        text not null,
  description  text,
  location     text,
  county       text,
  type         text check (type in ('single_room','bedsitter','studio','1br','2br','3br','4br','5br_plus')),
  price        integer,
  amenities    text[] default '{}',
  images       text[] default '{}',
  is_active    boolean default false,
  is_featured  boolean default false,
  expires_at   timestamptz,
  view_count   integer default 0,
  inquiry_count integer default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Listing Payments ──────────────────────────────────────────────────────────
create table if not exists listing_payments (
  id                           uuid primary key default uuid_generate_v4(),
  property_id                  uuid references properties(id) on delete set null,
  landlord_id                  text references profiles(id),
  amount                       integer not null,
  amount_paid                  integer,
  property_type                text,
  status                       text default 'pending' check (status in ('pending','confirmed','failed','cancelled')),
  mpesa_checkout_request_id    text unique,
  mpesa_code                   text,
  payer_phone                  text,
  failure_reason               text,
  confirmed_at                 timestamptz,
  created_at                   timestamptz default now()
);

-- ── Inquiries ────────────────────────────────────────────────────────────────
create table if not exists inquiries (
  id           uuid primary key default uuid_generate_v4(),
  property_id  uuid references properties(id) on delete cascade,
  tenant_id    text references profiles(id),
  landlord_id  text references profiles(id),
  message      text not null,
  status       text default 'pending' check (status in ('pending','responded','closed')),
  created_at   timestamptz default now()
);

-- ── Saved Properties ─────────────────────────────────────────────────────────
create table if not exists saved_properties (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    text references profiles(id) on delete cascade,
  property_id  uuid references properties(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(tenant_id, property_id)
);

-- ── Search Alerts ─────────────────────────────────────────────────────────────
create table if not exists search_alerts (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    text references profiles(id) on delete cascade,
  county       text,
  type         text,
  max_price    integer,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- ── SMS Logs ─────────────────────────────────────────────────────────────────
create table if not exists sms_logs (
  id               uuid primary key default uuid_generate_v4(),
  type             text,
  recipient_phone  text,
  message          text,
  status           text default 'sent',
  created_at       timestamptz default now()
);

-- ── Indexes for performance ───────────────────────────────────────────────────
create index if not exists idx_properties_active    on properties(is_active);
create index if not exists idx_properties_county    on properties(county);
create index if not exists idx_properties_type      on properties(type);
create index if not exists idx_properties_landlord  on properties(landlord_id);
create index if not exists idx_properties_expires   on properties(expires_at);
create index if not exists idx_inquiries_landlord   on inquiries(landlord_id);
create index if not exists idx_inquiries_tenant     on inquiries(tenant_id);
create index if not exists idx_payments_status      on listing_payments(status);
create index if not exists idx_payments_landlord    on listing_payments(landlord_id);
create index if not exists idx_saved_tenant         on saved_properties(tenant_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table profiles          enable row level security;
alter table properties        enable row level security;
alter table listing_payments  enable row level security;
alter table inquiries         enable row level security;
alter table saved_properties  enable row level security;
alter table search_alerts     enable row level security;
alter table sms_logs          enable row level security;

-- Profiles: users can read/write their own
create policy "profiles_self" on profiles
  for all using (auth.uid()::text = id);

-- Profiles: anyone can read basic info (for inquiry display)
create policy "profiles_public_read" on profiles
  for select using (true);

-- Properties: anyone can read active listings
create policy "properties_public_read" on properties
  for select using (is_active = true);

-- Properties: landlords can manage their own
create policy "properties_owner_all" on properties
  for all using (auth.uid()::text = landlord_id);

-- Payments: owners can read their own
create policy "payments_owner_read" on listing_payments
  for select using (auth.uid()::text = landlord_id);

-- Payments: service role can write (from edge functions)
create policy "payments_service_write" on listing_payments
  for all using (true);  -- restrict to service_role in production

-- Inquiries: landlords and tenants can read relevant ones
create policy "inquiries_read" on inquiries
  for select using (
    auth.uid()::text = landlord_id or
    auth.uid()::text = tenant_id
  );

-- Inquiries: authenticated users can create
create policy "inquiries_create" on inquiries
  for insert with check (true);

-- Inquiries: landlords can update status
create policy "inquiries_update" on inquiries
  for update using (auth.uid()::text = landlord_id);

-- Saved properties: users manage their own
create policy "saved_self" on saved_properties
  for all using (auth.uid()::text = tenant_id);

-- Search alerts: users manage their own
create policy "alerts_self" on search_alerts
  for all using (auth.uid()::text = tenant_id);

-- ── Auto-expire listings trigger ──────────────────────────────────────────────
create or replace function expire_old_listings()
returns void language plpgsql as $$
begin
  update properties
  set is_active = false
  where is_active = true
    and expires_at is not null
    and expires_at < now();
end;
$$;

-- ── Auto-increment view count ─────────────────────────────────────────────────
create or replace function increment_view(property_id uuid)
returns void language sql as $$
  update properties set view_count = view_count + 1 where id = property_id;
$$;

-- ── Auto-increment inquiry count ──────────────────────────────────────────────
create or replace function increment_inquiry_count()
returns trigger language plpgsql as $$
begin
  update properties
  set inquiry_count = inquiry_count + 1
  where id = new.property_id;
  return new;
end;
$$;

create trigger on_inquiry_created
  after insert on inquiries
  for each row execute function increment_inquiry_count();

-- ── Updated_at trigger ────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger properties_updated_at
  before update on properties
  for each row execute function update_updated_at();

-- ── Seed: sample listings for demo ────────────────────────────────────────────
-- Uncomment to add sample data
/*
insert into properties (title, location, county, type, price, amenities, is_active, expires_at)
values
  ('Cozy Bedsitter, Milimani', 'Milimani', 'Nakuru', 'bedsitter', 7000, ARRAY['Water 24/7','Security Guard','Parking'], true, now() + interval '30 days'),
  ('Modern 1BR, Westlands', 'Westlands', 'Nairobi', '1br', 25000, ARRAY['Water 24/7','WiFi Ready','CCTV','Parking'], true, now() + interval '25 days'),
  ('Studio Apartment, Kilimani', 'Kilimani', 'Nairobi', 'studio', 18000, ARRAY['Water 24/7','DSTV Ready','Tiled Floors'], true, now() + interval '20 days'),
  ('Spacious 2BR, Kisumu', 'Milimani', 'Kisumu', '2br', 20000, ARRAY['Borehole','Parking','Garden'], true, now() + interval '15 days'),
  ('Single Room, Kericho', 'Town Centre', 'Kericho', 'single_room', 4500, ARRAY['Water 24/7','Near Tarmac'], true, now() + interval '28 days');
*/
