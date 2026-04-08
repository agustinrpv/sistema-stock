create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  sku text unique,
  barcode text,
  description text,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  min_stock integer not null default 0,
  current_stock integer not null default 0,
  product_type text not null check (product_type in ('accessory', 'device')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  imei text,
  serial_number text,
  status text not null default 'available' check (status in ('available', 'sold', 'reserved')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stock_entries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2),
  supplier text,
  reference_number text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null default 'cash',
  customer_name text,
  customer_phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_unit_id uuid references product_units(id) on delete set null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  product_unit_id uuid references product_units(id) on delete set null,
  movement_type text not null check (movement_type in ('entry', 'sale', 'adjustment', 'return')),
  quantity integer not null,
  previous_stock integer,
  new_stock integer,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category_id on products(category_id);
create index if not exists idx_products_product_type on products(product_type);
create index if not exists idx_products_is_active on products(is_active);
create index if not exists idx_product_units_product_id on product_units(product_id);
create index if not exists idx_product_units_status on product_units(status);
create index if not exists idx_stock_entries_product_id on stock_entries(product_id);
create index if not exists idx_sales_created_at on sales(created_at desc);
create index if not exists idx_sale_items_sale_id on sale_items(sale_id);
create index if not exists idx_sale_items_product_id on sale_items(product_id);
create index if not exists idx_stock_movements_product_id on stock_movements(product_id);
create index if not exists idx_stock_movements_created_at on stock_movements(created_at desc);

insert into categories (name)
values
  ('Celulares'),
  ('Fundas'),
  ('Auriculares'),
  ('Cargadores'),
  ('Accesorios')
on conflict (name) do nothing;