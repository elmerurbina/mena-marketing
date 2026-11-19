-- =====================================================================
--  MENA Marketing · Esquema de base de datos (Supabase / PostgreSQL)
--  Ejecutar completo en: Supabase → SQL Editor → New query → Run
--  Es idempotente: puede ejecutarse más de una vez.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Usuarios administrativos (acceso SOLO por asignación manual)
--    Un usuario de Supabase Auth NO puede entrar al panel a menos que
--    exista una fila activa para él en esta tabla.
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  role       text not null default 'editor' check (role in ('admin', 'editor')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ¿El usuario actual es personal autorizado (admin o editor) y está activo?
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and active);
$$;

-- ¿El usuario actual es administrador activo?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and active and role = 'admin');
$$;

-- Marca de tiempo de actualización
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 2. Información de la empresa (fila única id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.company_settings (
  id               int primary key default 1 check (id = 1),
  name             text not null default 'MENA Marketing',
  tagline          text,
  description      text,
  hero_title       text,
  hero_subtitle    text,
  hero_image       text,
  email            text,
  phone            text,
  whatsapp         text,
  whatsapp_message text,
  address          text,
  instagram        text,
  facebook         text,
  tiktok           text,
  linkedin         text,
  youtube          text,
  stat_projects    int,
  stat_clients     int,
  stat_years       int,
  updated_at       timestamptz not null default now()
);
insert into public.company_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. Información institucional (quiénes somos, misión, visión, valores…)
-- ---------------------------------------------------------------------
create table if not exists public.institutional_content (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'about',
  title      text not null,
  body       text not null,
  sort_order int not null default 0,
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Servicios
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  summary     text not null default '',
  description text not null default '',
  image_url   text,
  features    text[] default '{}',
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Categorías, proyectos y fotografías del portafolio
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text,
  client      text,
  category_id uuid references public.categories(id) on delete set null,
  cover_url   text,
  featured    boolean not null default false,
  published   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_category_idx on public.projects(category_id);

create table if not exists public.photos (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  storage_path      text,
  url               text not null,
  alt_text          text not null default '',
  description       text,
  sort_order        int not null default 0,
  published         boolean not null default true,
  -- RN-008 / 13.1: confirmación de que se cuenta con autorización de uso
  consent_confirmed boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists photos_project_idx on public.photos(project_id);

-- ---------------------------------------------------------------------
-- 6. Solicitudes de contacto / cotización
-- ---------------------------------------------------------------------
create table if not exists public.contact_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 120),
  email        text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' and char_length(email) <= 160),
  phone        text check (phone is null or char_length(phone) <= 40),
  service_id   uuid references public.services(id) on delete set null,
  service_name text,
  message      text not null check (char_length(message) between 10 and 3000),
  consent      boolean not null default false check (consent),
  status       text not null default 'nueva' check (status in ('nueva', 'en_revision', 'atendida', 'cerrada')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists contact_requests_created_idx on public.contact_requests(created_at desc);

-- Protección contra envíos abusivos (RNF-009): máx. 3 solicitudes por correo cada 10 minutos
create or replace function public.contact_requests_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.contact_requests
      where lower(email) = lower(new.email) and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Demasiadas solicitudes. Intenta nuevamente más tarde.' using errcode = 'P0001';
  end if;
  -- Los visitantes no pueden fijar estado ni notas internas
  if not public.is_staff() then
    new.status := 'nueva';
    new.notes := null;
  end if;
  return new;
end $$;

drop trigger if exists contact_requests_guard on public.contact_requests;
create trigger contact_requests_guard before insert on public.contact_requests
  for each row execute function public.contact_requests_guard();

-- Triggers updated_at
do $$
declare t text;
begin
  foreach t in array array['company_settings','institutional_content','services','projects','contact_requests'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- =====================================================================
--  ROW LEVEL SECURITY (control de acceso verificado en el servidor)
-- =====================================================================
alter table public.admin_users           enable row level security;
alter table public.company_settings      enable row level security;
alter table public.institutional_content enable row level security;
alter table public.services              enable row level security;
alter table public.categories            enable row level security;
alter table public.projects              enable row level security;
alter table public.photos                enable row level security;
alter table public.contact_requests      enable row level security;

-- Limpia políticas previas para poder re-ejecutar el script
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
           and tablename in ('admin_users','company_settings','institutional_content','services',
                             'categories','projects','photos','contact_requests') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- admin_users: cada quien ve su propia fila; los administradores ven y gestionan todas.
-- Las altas se hacen desde Supabase (SQL o Table Editor), no desde el sitio.
create policy "staff ve su fila"       on public.admin_users for select using (user_id = auth.uid() or public.is_admin());
create policy "admin actualiza staff"  on public.admin_users for update using (public.is_admin()) with check (public.is_admin());

-- company_settings
create policy "lectura pública ajustes" on public.company_settings for select using (true);
create policy "staff edita ajustes"     on public.company_settings for update using (public.is_staff()) with check (public.is_staff());

-- institutional_content
create policy "lectura pública institucional" on public.institutional_content for select using (published or public.is_staff());
create policy "staff gestiona institucional"  on public.institutional_content for all using (public.is_staff()) with check (public.is_staff());

-- services
create policy "lectura pública servicios" on public.services for select using (active or public.is_staff());
create policy "staff gestiona servicios"  on public.services for all using (public.is_staff()) with check (public.is_staff());

-- categories
create policy "lectura pública categorías" on public.categories for select using (active or public.is_staff());
create policy "staff gestiona categorías"  on public.categories for all using (public.is_staff()) with check (public.is_staff());

-- projects
create policy "lectura pública proyectos" on public.projects for select using (published or public.is_staff());
create policy "staff gestiona proyectos"  on public.projects for all using (public.is_staff()) with check (public.is_staff());

-- photos (solo visibles si la foto y su proyecto están publicados)
create policy "lectura pública fotos" on public.photos for select using (
  public.is_staff() or (published and exists (select 1 from public.projects p where p.id = project_id and p.published))
);
create policy "staff gestiona fotos" on public.photos for all using (public.is_staff()) with check (public.is_staff());

-- contact_requests: cualquiera puede ENVIAR; solo administradores pueden CONSULTAR (RNF-035, RN-010)
create policy "visitantes envían solicitudes" on public.contact_requests for insert to anon, authenticated with check (consent);
create policy "admin consulta solicitudes"    on public.contact_requests for select using (public.is_admin());
create policy "admin actualiza solicitudes"   on public.contact_requests for update using (public.is_admin()) with check (public.is_admin());
create policy "admin elimina solicitudes"     on public.contact_requests for delete using (public.is_admin());

-- =====================================================================
--  STORAGE: bucket público "media" para fotografías e imágenes
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];

drop policy if exists "media lectura pública" on storage.objects;
drop policy if exists "media staff sube"      on storage.objects;
drop policy if exists "media staff actualiza" on storage.objects;
drop policy if exists "media staff elimina"   on storage.objects;

create policy "media lectura pública" on storage.objects for select using (bucket_id = 'media');
create policy "media staff sube"      on storage.objects for insert with check (bucket_id = 'media' and public.is_staff());
create policy "media staff actualiza" on storage.objects for update using (bucket_id = 'media' and public.is_staff());
create policy "media staff elimina"   on storage.objects for delete using (bucket_id = 'media' and public.is_staff());
