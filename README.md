# MENA Marketing — Sitio web corporativo

Sitio corporativo de **MENA Marketing** (publicidad, marketing y fotografía) con panel administrativo, construido con **Astro 7** (SSR en Vercel) y **Supabase** (base de datos, autenticación y almacenamiento de imágenes).

Implementa los requerimientos de la ERS v1.0: inicio, nosotros, catálogo de servicios con detalle, portafolio con categorías y visor ampliado, formulario de contacto con validación y registro, WhatsApp, redes sociales, SEO (sitemap, robots, Open Graph, JSON-LD) y panel de administración con roles.

## Estructura

```
src/
  components/      Componentes del sitio (LogoMark = isotipo "M" facetado vectorial)
  layouts/         SiteLayout (público) y AdminLayout (panel)
  lib/             Supabase, consultas, tipos, utilidades y helpers del panel
  middleware.ts    Protección de /admin + cabeceras de seguridad
  pages/           Páginas públicas, /api/contact y /admin/*
  scripts/motion.ts  Animaciones (GSAP + ScrollTrigger + Lenis)
  styles/          global.css (sitio) y admin.css (panel)
supabase/
  schema.sql       Tablas, RLS, triggers y bucket de imágenes
  seed.sql         Datos iniciales (servicios, categorías, textos)
```

## 1. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pega y ejecuta `supabase/schema.sql`, luego `supabase/seed.sql` y `supabase/analytics.sql` (estadísticas).
3. **Authentication → Sign In / Providers → Email**: desactiva **"Allow new users to sign up"**.
   Así nadie puede registrarse por su cuenta; solo tú creas usuarios.
4. Copia `.env.example` a `.env` y completa con **Project Settings → API**:
   ```
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SITE_URL=https://mena-marketing.vercel.app
   ```

> Las variables se leen solo en el servidor (`astro:env/server`) y nunca se envían al navegador. Solo se usa la clave **anon/publishable**. Todos los permisos se aplican en la base de datos con Row Level Security; nunca pongas la `service_role` en el proyecto.

## 2. Dar acceso al panel

El acceso a `/admin` es **exclusivamente por asignación manual**. Una cuenta de Supabase Auth sin fila activa en `admin_users` no puede entrar (se le cierra la sesión automáticamente).

1. **Authentication → Users → Add user** (correo + contraseña, marca "Auto confirm") o **Invite**.
2. **SQL Editor**:
   ```sql
   insert into public.admin_users (user_id, email, full_name, role)
   select id, email, 'Tu Nombre', 'admin'   -- 'admin' o 'editor'
   from auth.users where email = 'tu@correo.com';
   ```
3. Entra en `https://mena-marketing.vercel.app/admin/login`.

Para revocar acceso: desactívalo desde **Panel → Usuarios** o borra su fila en `admin_users`.

| Operación | Admin | Editor |
|---|---|---|
| Servicios, portafolio, categorías, institucional, contacto | ✓ | ✓ |
| Solicitudes de clientes (datos personales) | ✓ | — |
| Usuarios y roles | ✓ | — |

## 3. Desarrollo

```powershell
npm install
npm run dev
```

Sin `.env`, el sitio público funciona con el contenido por defecto de la ERS (el formulario y el panel requieren Supabase).

## 4. Despliegue en Vercel

El proyecto usa el adaptador `@astrojs/vercel` (funciones serverless).

1. Importa el repositorio en Vercel (framework detectado: Astro).
2. **Settings → Environment Variables** (Production y Preview):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SITE_URL` = `https://mena-marketing.vercel.app` (cámbialo si conectas un dominio propio)
3. Despliega. Vercel sirve el sitio con HTTPS automáticamente (RNF-004).
4. En Supabase → **Authentication → URL Configuration**, pon `https://mena-marketing.vercel.app` como **Site URL** (necesario para correos de invitación y recuperación de contraseña).

> `SITE_URL` se usa al compilar (sitemap, canonical, Open Graph): si lo cambias, vuelve a desplegar.

## Seguridad implementada

- RLS en todas las tablas; los visitantes solo pueden **insertar** solicitudes, nunca leerlas.
- Middleware valida el token con `auth.getUser()` y la pertenencia a `admin_users` en cada petición a `/admin`.
- Protección CSRF (`security.checkOrigin`), cabeceras `nosniff`, `X-Frame-Options`, `Referrer-Policy`.
- Formulario: validación cliente + servidor + BD, campo trampa, tiempo mínimo y límite por correo (trigger en la BD). El límite por IP es en memoria y en Vercel solo aplica por instancia, así que la protección principal es la de la base de datos.
- Login con límite de intentos. Contraseñas gestionadas por Supabase Auth (bcrypt).
- Imágenes: tipos y tamaño validados (bucket limitado a 8 MB y formatos de imagen); el panel convierte a WebP antes de subir.

## Pendientes de la empresa (según ERS)

- Datos de contacto oficiales, WhatsApp y redes → **Panel → Empresa y contacto**.
- Misión, visión y valores aprobados → **Panel → Información institucional** (vienen ocultos).
- Revisar y aprobar el texto de `/privacidad`.
- Reemplazar `public/og-image.svg` por un PNG 1200×630 (algunas redes no muestran SVG).
- Respaldos: activa los backups de Supabase (plan Pro incluye PITR).

## Estadísticas

**Panel → Estadísticas** muestra visitas, visitantes únicos y nuevos, sesiones, páginas por sesión, duración media, tiempo en página y tasa de rebote, comparados con el periodo anterior. Agrupa por hora (hoy), día, semana, mes o año, e incluye páginas más vistas, fuentes de tráfico, campañas UTM, países y ciudades, dispositivos, navegadores, sistemas operativos, horas de mayor actividad y visitantes en línea ahora.

La analítica es propia: los datos se guardan en la tabla `page_views` de Supabase, sin cookies ni servicios de terceros, sin guardar IP y respetando *Do Not Track*. País y ciudad vienen de las cabeceras de geolocalización de Vercel (en local aparecen vacíos). Las fechas se agrupan en la zona horaria del navegador de quien consulta el panel.

## Animaciones

Preloader con el isotipo dibujándose, cortina dorada entre páginas, scroll suave (Lenis), títulos revelados palabra por palabra, imágenes con cortina, parallax, servicios con scroll horizontal fijado, botones magnéticos, cursor personalizado, tarjetas con inclinación 3D, marquesinas y grano cinematográfico. Todo se desactiva con `prefers-reduced-motion`.
