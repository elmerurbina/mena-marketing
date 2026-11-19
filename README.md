# MENA Marketing — Sitio web corporativo

Sitio corporativo de **MENA Marketing** (publicidad, marketing y fotografía) con panel administrativo, construido con **Astro 7** (SSR en Node) y **Supabase** (base de datos, autenticación y almacenamiento de imágenes).

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
2. **SQL Editor** → pega y ejecuta `supabase/schema.sql`, luego `supabase/seed.sql`.
3. **Authentication → Sign In / Providers → Email**: desactiva **"Allow new users to sign up"**.
   Así nadie puede registrarse por su cuenta; solo tú creas usuarios.
4. Copia `.env.example` a `.env` y completa con **Project Settings → API**:
   ```
   PUBLIC_SUPABASE_URL=...
   PUBLIC_SUPABASE_ANON_KEY=...
   SITE_URL=https://tu-dominio.com
   ```

> Solo se usa la clave **anon** (pública). Todos los permisos se aplican en la base de datos con Row Level Security; nunca pongas la `service_role` en el proyecto.

## 2. Dar acceso al panel

El acceso a `/admin` es **exclusivamente por asignación manual**. Una cuenta de Supabase Auth sin fila activa en `admin_users` no puede entrar (se le cierra la sesión automáticamente).

1. **Authentication → Users → Add user** (correo + contraseña, marca "Auto confirm") o **Invite**.
2. **SQL Editor**:
   ```sql
   insert into public.admin_users (user_id, email, full_name, role)
   select id, email, 'Tu Nombre', 'admin'   -- 'admin' o 'editor'
   from auth.users where email = 'tu@correo.com';
   ```
3. Entra en `https://tu-dominio.com/admin/login`.

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

## 4. Producción

```powershell
npm run build
node ./dist/server/entry.mjs
```

Variables necesarias en el servidor: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SITE_URL`, `HOST=0.0.0.0`, `PORT`. Sirve el sitio detrás de HTTPS (RNF-004). Compatible con cualquier hosting Node (Railway, Render, Fly.io, VPS). Para Vercel/Netlify cambia el adaptador en `astro.config.mjs`.

## Seguridad implementada

- RLS en todas las tablas; los visitantes solo pueden **insertar** solicitudes, nunca leerlas.
- Middleware valida el token con `auth.getUser()` y la pertenencia a `admin_users` en cada petición a `/admin`.
- Protección CSRF (`security.checkOrigin`), cabeceras `nosniff`, `X-Frame-Options`, `Referrer-Policy`.
- Formulario: validación cliente + servidor + BD, campo trampa, tiempo mínimo, límite por IP y por correo (trigger).
- Login con límite de intentos. Contraseñas gestionadas por Supabase Auth (bcrypt).
- Imágenes: tipos y tamaño validados (bucket limitado a 8 MB y formatos de imagen); el panel convierte a WebP antes de subir.

## Pendientes de la empresa (según ERS)

- Datos de contacto oficiales, WhatsApp y redes → **Panel → Empresa y contacto**.
- Misión, visión y valores aprobados → **Panel → Información institucional** (vienen ocultos).
- Revisar y aprobar el texto de `/privacidad`.
- Reemplazar `public/og-image.svg` por un PNG 1200×630 (algunas redes no muestran SVG).
- Respaldos: activa los backups de Supabase (plan Pro incluye PITR).

## Animaciones

Preloader con el isotipo dibujándose, cortina dorada entre páginas, scroll suave (Lenis), títulos revelados palabra por palabra, imágenes con cortina, parallax, servicios con scroll horizontal fijado, botones magnéticos, cursor personalizado, tarjetas con inclinación 3D, marquesinas y grano cinematográfico. Todo se desactiva con `prefers-reduced-motion`.
