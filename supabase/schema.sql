-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────
create table if not exists profiles (
  id                  text primary key,
  full_name           text,
  phone               text,
  email               text,
  role                text check (role in (
    'landlord','caretaker','agent',
    'tenant','admin','superadmin'
  )) default 'tenant',
  avatar_url          text,
  is_active           boolean default true,
  email_notifications  boolean default true,
  sms_notifications    boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── PROPERTIES ───────────────────────────────────
create table if not exists properties (
  id              uuid primary key default uuid_generate_v4(),
  landlord_id     text references profiles(id) on delete cascade,
  title           text not null,
  description     text,
  location        text,
  county          text,
  type            text check (type in (
    'single_room','bedsitter','studio',
    '1br','2br','3br','4br','5br_plus'
  )),
  price           integer,
  amenities       text[] default '{}',
  images          text[] default '{}',
  is_active       boolean default false,
  is_featured     boolean default false,
  expires_at      timestamptz,
  view_count      integer default 0,
  inquiry_count   integer default 0,
  payment_model   text default 'pay_once' check (
    payment_model in ('pay_once', 'pay_per_inquiry')
  ),
  listing_model   text default 'flat_fee',
  payment_status  text default 'unpaid' check (
    payment_status in (
      'unpaid',
      'pending_verification',
      'verified',
      'rejected'
    )
  ),
  rejection_reason text,
  expiry_sms_sent  boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── LISTING PAYMENTS ─────────────────────────────
create table if not exists listing_payments (
  id                uuid primary key default uuid_generate_v4(),
  property_id       uuid references properties(id) on delete cascade,
  landlord_id       text references profiles(id),
  amount            integer not null,
  amount_paid       numeric,
  property_type     text,
  mpesa_code        text unique,
  payer_phone       text,
  status            text default 'pending' check (
    status in (
      'pending',
      'confirmed',
      'failed',
      'cancelled'
    )
  ),
  rejection_reason  text,
  verified_at       timestamptz,
  verified_by       text,
  created_at        timestamptz default now()
);

-- ── INQUIRIES ────────────────────────────────────
create table if not exists inquiries (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid references properties(id) on delete cascade,
  tenant_id     text references profiles(id),
  landlord_id   text references profiles(id),
  message       text not null,
  tenant_name   text,
  tenant_phone  text,
  tenant_email  text,
  status        text default 'pending' check (
    status in ('pending','responded','closed')
  ),
  is_unlocked   boolean default false,
  is_locked     boolean default true,
  unlocked_at   timestamptz,
  unlocked_by_credit_tx_id uuid references credit_transactions(id) on delete set null,
  reply         text,
  replied_at    timestamptz,
  created_at    timestamptz default now()
);

-- ── SAVED PROPERTIES ─────────────────────────────
create table if not exists saved_properties (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    text references profiles(id) on delete cascade,
  property_id  uuid references properties(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(tenant_id, property_id)
);

-- ── SEARCH ALERTS ────────────────────────────────
create table if not exists search_alerts (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    text references profiles(id) on delete cascade,
  county       text,
  type         text,
  max_price    integer,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- ── SMS LOGS ─────────────────────────────────────
create table if not exists sms_logs (
  id               uuid primary key default uuid_generate_v4(),
  recipient_phone  text not null,
  message          text not null,
  type             text,
  status           text default 'sent',
  at_response      jsonb,
  created_at       timestamptz default now()
);

-- ── INDEXES ──────────────────────────────────────
create index if not exists idx_properties_active
  on properties(is_active);
create index if not exists idx_properties_county
  on properties(county);
create index if not exists idx_properties_type
  on properties(type);
create index if not exists idx_properties_landlord
  on properties(landlord_id);
create index if not exists idx_properties_payment
  on properties(payment_status);
create index if not exists idx_properties_expires
  on properties(expires_at) where is_active = true;
create index if not exists idx_payments_status
  on listing_payments(status);
create index if not exists idx_payments_landlord
  on listing_payments(landlord_id);
create index if not exists idx_payments_mpesa_code
  on listing_payments(mpesa_code);
create index if not exists idx_inquiries_landlord
  on inquiries(landlord_id);
create index if not exists idx_inquiries_tenant
  on inquiries(tenant_id);
create index if not exists idx_saved_tenant
  on saved_properties(tenant_id);

-- ── ROW LEVEL SECURITY ───────────────────────────
alter table profiles          enable row level security;
alter table properties        enable row level security;
alter table listing_payments  enable row level security;
alter table inquiries         enable row level security;
alter table saved_properties  enable row level security;
alter table search_alerts     enable row level security;
alter table sms_logs          enable row level security;

-- PROFILES: public read, anyone can insert/update
create policy "profiles_public_read" on profiles
  for select using (true);
create policy "profiles_insert" on profiles
  for insert with check (true);
create policy "profiles_update" on profiles
  for update using (true);

-- PROPERTIES: public read active, full access for all
create policy "properties_public_read" on properties
  for select using (is_active = true);
create policy "properties_full_access" on properties
  for all using (true);

-- PAYMENTS: full access (server handles auth)
create policy "payments_full_access" on listing_payments
  for all using (true);

-- INQUIRIES: full access
create policy "inquiries_full_access" on inquiries
  for all using (true);

-- SAVED: full access
create policy "saved_full_access" on saved_properties
  for all using (true);

-- ALERTS: full access
create policy "alerts_full_access" on search_alerts
  for all using (true);

-- SMS LOGS: full access
create policy "sms_full_access" on sms_logs
  for all using (true);

-- ── TRIGGERS ─────────────────────────────────────

-- Auto update updated_at
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

-- Auto activate listing when payment confirmed
create or replace function handle_payment_status_change()
returns trigger language plpgsql as $$
begin
  -- Payment confirmed → activate listing
  if NEW.status = 'confirmed'
     and OLD.status != 'confirmed'
     and NEW.property_id is not null
  then
    update properties
    set
      is_active      = true,
      payment_status = 'verified',
      expires_at     = now() + interval '30 days'
    where id = NEW.property_id;
  end if;

  -- Payment failed → mark as rejected
  if NEW.status = 'failed'
     and OLD.status = 'pending'
     and NEW.property_id is not null
  then
    update properties
    set
      payment_status   = 'rejected',
      rejection_reason = NEW.rejection_reason
    where id = NEW.property_id;
  end if;

  return NEW;
end;
$$;

create trigger on_payment_status_change
  after update on listing_payments
  for each row execute function handle_payment_status_change();

-- Auto increment inquiry count
create or replace function increment_inquiry_count()
returns trigger language plpgsql as $$
begin
  update properties
  set inquiry_count = inquiry_count + 1
  where id = NEW.property_id;
  return NEW;
end;
$$;

create trigger on_inquiry_created
  after insert on inquiries
  for each row execute function increment_inquiry_count();

-- Auto increment view count function
create or replace function increment_view_count(p_id uuid)
returns void language sql as $$
  update properties
  set view_count = view_count + 1
  where id = p_id;
$$;

-- Google OAuth new user profile handler
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    new.email,
    new.raw_user_meta_data->>'role'
  )
  on conflict (id) do update
  set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    email = coalesce(public.profiles.email, excluded.email);
  return new;
end;
$$;

-- Trigger to run this automatically on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── BOOSTS & MONETIZATION COLUMNS ────────────────────
alter table properties add column if not exists is_boosted boolean default false;
alter table properties add column if not exists boost_tier text default null;
alter table properties add column if not exists boost_expires_at timestamptz default null;
alter table properties add column if not exists boost_badge text default null;
alter table properties add column if not exists lead_credits integer default 0;
alter table profiles add column if not exists lead_credits integer default 0;

-- ── LISTING BOOSTS TABLE ─────────────────────────────
create table if not exists listing_boosts (
  id                        uuid primary key default uuid_generate_v4(),
  property_id               uuid references properties(id) on delete cascade,
  landlord_id               text references profiles(id) on delete cascade,
  boost_tier                text not null,
  amount_paid               numeric not null,
  status                    text default 'pending' check (status in ('pending', 'confirmed', 'failed', 'cancelled', 'expired')),
  mpesa_checkout_request_id text,
  payment_method            text default 'stk_push',
  mpesa_code                text,
  starts_at                 timestamptz,
  expires_at                timestamptz,
  warning_sent              boolean default false,
  created_at                timestamptz default now()
);

alter table listing_boosts enable row level security;
drop policy if exists "boosts_landlord_select" on listing_boosts;
create policy "boosts_landlord_select" on listing_boosts for select using (
  auth.uid()::text = landlord_id or exists (select 1 from profiles where id = auth.uid()::text and role in ('admin', 'superadmin'))
);
drop policy if exists "boosts_landlord_insert" on listing_boosts;
create policy "boosts_landlord_insert" on listing_boosts for insert with check (auth.uid()::text = landlord_id);

-- ── LEAD UNLOCKS TABLE ─────────────────────────────
create table if not exists lead_unlocks (
  id                        uuid primary key default uuid_generate_v4(),
  tenant_id                 text references profiles(id) on delete cascade,
  listing_id                uuid references properties(id) on delete cascade,
  property_id               uuid references properties(id) on delete cascade,
  landlord_id               text references profiles(id) on delete cascade,
  inquiry_id                uuid references inquiries(id) on delete set null,
  bundle_size               integer default 1,
  credits_spent             integer default 1,
  credits_added             integer default 0,
  amount_paid               numeric default 0,
  payment_method            text default 'credit',
  mpesa_code                text,
  mpesa_checkout_request_id text,
  status                    text default 'confirmed' check (status in ('pending', 'confirmed', 'confirmed_pending_credit_issue', 'failed', 'rejected')),
  unlocked_at               timestamptz default now(),
  created_at                timestamptz default now()
);

-- Ensure columns exist if table was already created
alter table lead_unlocks add column if not exists credits_added integer default 0;
alter table lead_unlocks add column if not exists mpesa_checkout_request_id text;

-- ── CREDIT TRANSACTIONS AUDIT LEDGER ──────────────
create table if not exists credit_transactions (
  id            uuid primary key default uuid_generate_v4(),
  landlord_id   text references profiles(id) on delete cascade,
  property_id   uuid references properties(id) on delete cascade,
  unlock_id     uuid references lead_unlocks(id) on delete set null,
  amount_paid   numeric default 0,
  credits_added integer not null,
  type          text check (type in ('bundle_purchase', 'single_purchase', 'reconciliation', 'admin_adjustment', 'lead_spent', 'admin_grant')),
  notes         text,
  created_at    timestamptz default now()
);

alter table credit_transactions enable row level security;
drop policy if exists "credit_transactions_read" on credit_transactions;
create policy "credit_transactions_read" on credit_transactions for select using (true);
drop policy if exists "credit_transactions_insert" on credit_transactions;
create policy "credit_transactions_insert" on credit_transactions for insert with check (true);

-- Indexes for performance
create index if not exists idx_lead_unlocks_tenant on lead_unlocks(tenant_id);
create index if not exists idx_lead_unlocks_listing on lead_unlocks(listing_id);
create index if not exists idx_lead_unlocks_property on lead_unlocks(property_id);
create index if not exists idx_lead_unlocks_landlord on lead_unlocks(landlord_id);

-- Unique index to prevent duplicate unlocks for the same tenant and listing
create unique index if not exists idx_lead_unlocks_tenant_listing_confirmed 
  on lead_unlocks(tenant_id, listing_id) 
  where status = 'confirmed';

-- Row Level Security
alter table lead_unlocks enable row level security;

-- Tenants can only read their own unlock records
drop policy if exists "lead_unlocks_tenant_select" on lead_unlocks;
create policy "lead_unlocks_tenant_select" on lead_unlocks
  for select using (auth.uid()::text = tenant_id);

-- Landlords & Admins can read unlocks for their own listings
drop policy if exists "lead_unlocks_landlord_select" on lead_unlocks;
create policy "lead_unlocks_landlord_select" on lead_unlocks
  for select using (
    auth.uid()::text = landlord_id OR 
    exists (
      select 1 from profiles where id = auth.uid()::text and role in ('admin', 'superadmin')
    )
  );

-- Insert policy: user inserting must be tenant or landlord
drop policy if exists "lead_unlocks_insert" on lead_unlocks;
create policy "lead_unlocks_insert" on lead_unlocks
  for insert with check (
    auth.uid()::text = tenant_id OR auth.uid()::text = landlord_id
  );

-- ── ATOMIC STORED PROCEDURE: CONFIRM LEAD UNLOCK & ISSUE CREDITS ──
create or replace function confirm_lead_unlock_and_issue_credits(
  p_unlock_id uuid,
  p_mpesa_code text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_unlock record;
  v_credits_to_add integer := 0;
  v_new_prop_credits integer := 0;
  v_new_landlord_credits integer := 0;
begin
  -- 1. Select the unlock record for update
  select * into v_unlock from lead_unlocks where id = p_unlock_id for update;
  
  if v_unlock is null then
    raise exception 'Unlock record not found';
  end if;

  -- 2. Determine credits to issue (bundles issue credits; single unlocks unmask contact)
  if v_unlock.bundle_size > 1 or v_unlock.amount_paid >= 200 or v_unlock.inquiry_id is null then
    v_credits_to_add := case 
      when v_unlock.credits_added > 0 then v_unlock.credits_added
      when v_unlock.bundle_size > 1 then v_unlock.bundle_size
      else 5 
    end;
  else
    v_credits_to_add := 0;
  end if;

  -- 3. Update lead_unlocks
  update lead_unlocks
  set 
    status = 'confirmed',
    mpesa_code = coalesce(p_mpesa_code, mpesa_code),
    credits_added = v_credits_to_add,
    unlocked_at = now()
  where id = p_unlock_id;

  -- 4. Increment credits atomically
  if v_credits_to_add > 0 then
    if v_unlock.property_id is not null then
      update properties
      set lead_credits = coalesce(lead_credits, 0) + v_credits_to_add
      where id = v_unlock.property_id
      returning lead_credits into v_new_prop_credits;
    end if;

    if v_unlock.landlord_id is not null then
      update profiles
      set lead_credits = coalesce(lead_credits, 0) + v_credits_to_add
      where id = v_unlock.landlord_id
      returning lead_credits into v_new_landlord_credits;
    end if;

    -- 5. Insert into audit ledger
    insert into credit_transactions (
      landlord_id, property_id, unlock_id, amount_paid, credits_added, type, notes
    ) values (
      v_unlock.landlord_id, v_unlock.property_id, p_unlock_id, COALESCE(v_unlock.amount_paid, 0), v_credits_to_add, 'bundle_purchase', 'Atomic credit confirmation'
    );
  elsif v_unlock.inquiry_id is not null then
    update inquiries set is_unlocked = true, is_locked = false, unlocked_at = now() where id = v_unlock.inquiry_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'unlock_id', p_unlock_id,
    'credits_added', v_credits_to_add,
    'new_property_credits', v_new_prop_credits,
    'new_landlord_credits', v_new_landlord_credits
  );
exception when others then
  -- Safe rollback marker
  update lead_unlocks
  set status = 'confirmed_pending_credit_issue'
  where id = p_unlock_id;
  
  raise exception 'Transaction failed: %', SQLERRM;
end;
$$;

-- ── INQUIRIES GATED VIEW & STRICT RLS POLICIES ───────
alter table inquiries enable row level security;
drop policy if exists "inquiries_full_access" on inquiries;
drop policy if exists "inquiries_select_policy" on inquiries;
drop policy if exists "inquiries_insert_policy" on inquiries;
drop policy if exists "inquiries_update_policy" on inquiries;

create policy "inquiries_select_policy" on inquiries
  for select to authenticated using (
    landlord_id = auth.uid()::text or tenant_id = auth.uid()::text or
    exists (select 1 from profiles where profiles.id = auth.uid()::text and profiles.role in ('admin', 'superadmin'))
  );

create policy "inquiries_insert_policy" on inquiries
  for insert to authenticated with check (
    tenant_id = auth.uid()::text
  );

create policy "inquiries_update_policy" on inquiries
  for update to authenticated using (
    landlord_id = auth.uid()::text or tenant_id = auth.uid()::text or
    exists (select 1 from profiles where profiles.id = auth.uid()::text and profiles.role in ('admin', 'superadmin'))
  ) with check (
    landlord_id = auth.uid()::text or tenant_id = auth.uid()::text or
    exists (select 1 from profiles where profiles.id = auth.uid()::text and profiles.role in ('admin', 'superadmin'))
  );

create or replace view inquiries_gated as
select
  id,
  property_id,
  tenant_id,
  landlord_id,
  case
    when is_unlocked is true then tenant_name
    when (auth.uid()::text = tenant_id) then tenant_name
    when exists (select 1 from profiles where profiles.id = auth.uid()::text and profiles.role in ('admin', 'superadmin')) then tenant_name
    else 'Locked Lead'
  end as tenant_name,
  case
    when is_unlocked is true then tenant_phone
    when (auth.uid()::text = tenant_id) then tenant_phone
    when exists (select 1 from profiles where profiles.id = auth.uid()::text and profiles.role in ('admin', 'superadmin')) then tenant_phone
    else null
  end as tenant_phone,
  case
    when is_unlocked is true then tenant_email
    when (auth.uid()::text = tenant_id) then tenant_email
    when exists (select 1 from profiles where profiles.id = auth.uid()::text and profiles.role in ('admin', 'superadmin')) then tenant_email
    else null
  end as tenant_email,
  case
    when is_unlocked is true then message
    when (auth.uid()::text = tenant_id) then message
    when exists (select 1 from profiles where profiles.id = auth.uid()::text and profiles.role in ('admin', 'superadmin')) then message
    else '🔒 Lead is locked. Unlock this lead using your lead credits to view tenant phone, email, and message.'
  end as message,
  status,
  is_unlocked,
  is_locked,
  unlocked_at,
  unlocked_by_credit_tx_id,
  reply,
  replied_at,
  created_at
from inquiries;



