-- =====================================================================
--  MENA Marketing · Estadísticas de visitas (analítica propia, sin terceros)
--  Ejecutar en: Supabase → SQL Editor (después de schema.sql). Idempotente.
--
--  Privacidad: no se guarda la IP. El visitante se identifica con un ID
--  aleatorio anónimo generado en su navegador. Se respeta "Do Not Track".
-- =====================================================================

create table if not exists public.page_views (
  id             uuid primary key,
  created_at     timestamptz not null default now(),
  path           text not null,
  title          text,
  referrer_host  text,
  visitor_id     text not null,
  session_id     text not null,
  is_new_visitor boolean not null default false,
  country        text,
  region         text,
  city           text,
  device         text,
  browser        text,
  os             text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  screen_w       int,
  duration_ms    int
);
create index if not exists page_views_created_idx on public.page_views (created_at desc);
create index if not exists page_views_visitor_idx on public.page_views (visitor_id);
create index if not exists page_views_session_idx on public.page_views (session_id);

alter table public.page_views enable row level security;
drop policy if exists "staff lee visitas" on public.page_views;
create policy "staff lee visitas" on public.page_views for select using (public.is_staff());
-- Sin políticas de insert/update: los visitantes solo escriben mediante las funciones de abajo.

-- ---------------------------------------------------------------------
-- Registro de una página vista (llamado desde /api/track)
-- ---------------------------------------------------------------------
create or replace function public.track_pageview(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  begin
    v_id := (p->>'id')::uuid;
  exception when others then
    return;
  end;
  if coalesce(p->>'visitor_id', '') = '' or coalesce(p->>'session_id', '') = '' or coalesce(p->>'path', '') = '' then
    return;
  end if;

  insert into public.page_views (
    id, path, title, referrer_host, visitor_id, session_id, is_new_visitor,
    country, region, city, device, browser, os, utm_source, utm_medium, utm_campaign, screen_w
  ) values (
    v_id,
    left(p->>'path', 300),
    left(p->>'title', 200),
    nullif(left(p->>'referrer_host', 200), ''),
    left(p->>'visitor_id', 64),
    left(p->>'session_id', 64),
    coalesce((p->>'is_new_visitor')::boolean, false),
    nullif(left(p->>'country', 2), ''),
    nullif(left(p->>'region', 80), ''),
    nullif(left(p->>'city', 120), ''),
    nullif(left(p->>'device', 20), ''),
    nullif(left(p->>'browser', 40), ''),
    nullif(left(p->>'os', 40), ''),
    nullif(left(p->>'utm_source', 100), ''),
    nullif(left(p->>'utm_medium', 100), ''),
    nullif(left(p->>'utm_campaign', 100), ''),
    case when (p->>'screen_w') ~ '^\d{1,5}$' then (p->>'screen_w')::int end
  )
  on conflict (id) do nothing;
end $$;

-- Tiempo en la página (se envía al salir de ella)
create or replace function public.track_leave(p_id uuid, p_duration_ms int)
returns void language sql security definer set search_path = public as $$
  update public.page_views
     set duration_ms = least(greatest(p_duration_ms, 0), 1800000)
   where id = p_id and duration_ms is null and created_at > now() - interval '6 hours';
$$;

revoke all on function public.track_pageview(jsonb) from public;
revoke all on function public.track_leave(uuid, int) from public;
grant execute on function public.track_pageview(jsonb) to anon, authenticated;
grant execute on function public.track_leave(uuid, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Totales de un rango
-- ---------------------------------------------------------------------
create or replace function public.analytics_totals(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with v as (
    select * from public.page_views where created_at >= p_from and created_at < p_to
  ), s as (
    select session_id, count(*) as n, sum(coalesce(duration_ms, 0)) as dur from v group by session_id
  )
  select jsonb_build_object(
    'views',            (select count(*) from v),
    'visitors',         (select count(distinct visitor_id) from v),
    'new_visitors',     (select count(distinct visitor_id) from v where is_new_visitor),
    'sessions',         (select count(*) from s),
    'bounce_rate',      (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where n = 1) / count(*), 1) end from s),
    'pages_per_session',(select case when count(*) = 0 then 0 else round(sum(n)::numeric / count(*), 2) end from s),
    'avg_session_ms',   (select coalesce(round(avg(dur)), 0) from s),
    'avg_time_on_page_ms', (select coalesce(round(avg(duration_ms)), 0) from v where duration_ms is not null)
  );
$$;

-- ---------------------------------------------------------------------
-- Informe completo para el panel
--   p_period: hoy | dia (30 días) | semana (12 semanas) | mes (12 meses) | anio (5 años)
-- ---------------------------------------------------------------------
create or replace function public.analytics_report(p_period text, p_tz text default 'UTC')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  tz       text := case when exists (select 1 from pg_timezone_names where name = p_tz) then p_tz else 'UTC' end;
  now_l    timestamp := now() at time zone tz;
  bucket   text;
  step     interval;
  from_l   timestamp;
  to_l     timestamp;
  f        timestamptz;
  t        timestamptz;
  result   jsonb;
begin
  if not public.is_staff() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  case p_period
    when 'hoy'    then bucket := 'hour';  step := interval '1 hour';  from_l := date_trunc('day', now_l);                          to_l := from_l + interval '1 day';
    when 'semana' then bucket := 'week';  step := interval '1 week';  from_l := date_trunc('week', now_l) - interval '11 weeks';   to_l := date_trunc('week', now_l) + interval '1 week';
    when 'mes'    then bucket := 'month'; step := interval '1 month'; from_l := date_trunc('month', now_l) - interval '11 months'; to_l := date_trunc('month', now_l) + interval '1 month';
    when 'anio'   then bucket := 'year';  step := interval '1 year';  from_l := date_trunc('year', now_l) - interval '4 years';    to_l := date_trunc('year', now_l) + interval '1 year';
    else               bucket := 'day';   step := interval '1 day';   from_l := date_trunc('day', now_l) - interval '29 days';     to_l := date_trunc('day', now_l) + interval '1 day';
  end case;

  f := from_l at time zone tz;
  t := to_l at time zone tz;

  with v as (
    select pv.*, (pv.created_at at time zone tz) as lt
      from public.page_views pv
     where pv.created_at >= f and pv.created_at < t
  ),
  buckets as (
    select generate_series(from_l, to_l - step, step) as b
  ),
  series as (
    select b.b,
           count(v.id) as views,
           count(distinct v.visitor_id) as visitors
      from buckets b
      left join v on date_trunc(bucket, v.lt) = b.b
     group by b.b
     order by b.b
  )
  select jsonb_build_object(
    'period',   p_period,
    'bucket',   bucket,
    'tz',       tz,
    'from',     f,
    'to',       t,
    'totals',   public.analytics_totals(f, t),
    'previous', public.analytics_totals(f - (t - f), f),
    'series',   coalesce((select jsonb_agg(jsonb_build_object('t', to_char(b, 'YYYY-MM-DD"T"HH24:MI'), 'views', views, 'visitors', visitors) order by b) from series), '[]'::jsonb),
    'pages',    coalesce((select jsonb_agg(x) from (
                  select path as label, count(*) as views, count(distinct visitor_id) as visitors,
                         coalesce(round(avg(duration_ms)), 0) as avg_ms
                    from v group by path order by count(*) desc limit 12) x), '[]'::jsonb),
    'referrers',coalesce((select jsonb_agg(x) from (
                  select coalesce(referrer_host, 'Directo') as label, count(*) as views, count(distinct visitor_id) as visitors
                    from v group by 1 order by count(*) desc limit 10) x), '[]'::jsonb),
    'campaigns',coalesce((select jsonb_agg(x) from (
                  select concat_ws(' / ', utm_source, utm_medium, utm_campaign) as label, count(*) as views, count(distinct visitor_id) as visitors
                    from v where utm_source is not null group by 1 order by count(*) desc limit 10) x), '[]'::jsonb),
    'countries',coalesce((select jsonb_agg(x) from (
                  select coalesce(country, '??') as label, count(*) as views, count(distinct visitor_id) as visitors
                    from v group by 1 order by count(distinct visitor_id) desc limit 10) x), '[]'::jsonb),
    'cities',   coalesce((select jsonb_agg(x) from (
                  select concat_ws(', ', city, country) as label, count(*) as views, count(distinct visitor_id) as visitors
                    from v where city is not null group by 1 order by count(distinct visitor_id) desc limit 10) x), '[]'::jsonb),
    'devices',  coalesce((select jsonb_agg(x) from (
                  select coalesce(device, 'Desconocido') as label, count(*) as views, count(distinct visitor_id) as visitors
                    from v group by 1 order by count(distinct visitor_id) desc) x), '[]'::jsonb),
    'browsers', coalesce((select jsonb_agg(x) from (
                  select coalesce(browser, 'Otro') as label, count(*) as views, count(distinct visitor_id) as visitors
                    from v group by 1 order by count(distinct visitor_id) desc limit 8) x), '[]'::jsonb),
    'os',       coalesce((select jsonb_agg(x) from (
                  select coalesce(os, 'Otro') as label, count(*) as views, count(distinct visitor_id) as visitors
                    from v group by 1 order by count(distinct visitor_id) desc limit 8) x), '[]'::jsonb),
    'hours',    coalesce((select jsonb_agg(jsonb_build_object('h', h, 'views', coalesce(c, 0)) order by h) from (
                  select g.h, x.c from generate_series(0, 23) g(h)
                  left join (select extract(hour from lt)::int as h, count(*) as c from v group by 1) x on x.h = g.h) y), '[]'::jsonb)
  ) into result;

  return result;
end $$;

-- Resumen rápido: hoy, esta semana, este mes, este año y visitantes activos ahora
create or replace function public.analytics_overview(p_tz text default 'UTC')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  tz    text := case when exists (select 1 from pg_timezone_names where name = p_tz) then p_tz else 'UTC' end;
  now_l timestamp := now() at time zone tz;
begin
  if not public.is_staff() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'today', public.analytics_totals(date_trunc('day', now_l) at time zone tz, now()),
    'week',  public.analytics_totals(date_trunc('week', now_l) at time zone tz, now()),
    'month', public.analytics_totals(date_trunc('month', now_l) at time zone tz, now()),
    'year',  public.analytics_totals(date_trunc('year', now_l) at time zone tz, now()),
    'all',   (select jsonb_build_object('views', count(*), 'visitors', count(distinct visitor_id)) from public.page_views),
    'active_now', (select count(distinct visitor_id) from public.page_views where created_at > now() - interval '5 minutes')
  );
end $$;

-- analytics_totals solo se usa internamente desde las funciones de informe
revoke all on function public.analytics_totals(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.analytics_report(text, text) from public, anon;
revoke all on function public.analytics_overview(text) from public, anon;
grant execute on function public.analytics_report(text, text) to authenticated;
grant execute on function public.analytics_overview(text) to authenticated;
