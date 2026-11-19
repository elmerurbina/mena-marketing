-- =====================================================================
--  Datos iniciales (opcional). Ejecutar después de schema.sql
-- =====================================================================

update public.company_settings set
  name = 'MENA Marketing',
  tagline = 'Publicidad · Marketing · Fotografía',
  description = 'Soluciones publicitarias y creativas para negocios, emprendimientos y marcas que buscan mejorar su presencia digital y fortalecer su identidad comercial.',
  hero_title = 'Marcas que se recuerdan.',
  hero_subtitle = 'Estrategia, contenido y fotografía profesional para que tu marca comunique con la elegancia que merece.',
  whatsapp_message = 'Hola MENA Marketing, me gustaría solicitar información sobre sus servicios.'
where id = 1;

insert into public.services (slug, name, summary, description, features, sort_order) values
  ('asesoria-de-marketing', 'Asesoría de marketing',
   'Orientación estratégica para mejorar el posicionamiento y reconocimiento de tu marca.',
   'Analizamos tu marca, tu mercado y tus objetivos para trazar una ruta clara de posicionamiento. Te acompañamos en la toma de decisiones para que cada acción de comunicación sume al reconocimiento de tu negocio.',
   array['Diagnóstico de marca','Plan estratégico','Posicionamiento','Acompañamiento'], 1),
  ('gestion-de-redes-sociales', 'Gestión de redes sociales',
   'Administración de perfiles comerciales y planificación de publicaciones.',
   'Nos encargamos de tus perfiles comerciales con una línea editorial coherente, calendarios de publicación y contenido pensado para conectar con tu audiencia.',
   array['Planificación de contenido','Calendario editorial','Administración de perfiles','Línea gráfica'], 2),
  ('creacion-de-contenido', 'Creación de contenido',
   'Producción de material gráfico y audiovisual con identidad propia.',
   'Diseñamos y producimos piezas gráficas y audiovisuales que comunican la esencia de tu marca con una estética cuidada y profesional.',
   array['Diseño gráfico','Producción audiovisual','Piezas para redes','Material promocional'], 3),
  ('fotografia-profesional', 'Fotografía profesional',
   'Cobertura fotográfica de eventos, productos y actividades empresariales.',
   'Capturamos eventos, productos y actividades empresariales con una mirada profesional, cuidando la luz, la composición y cada detalle que distingue a tu marca.',
   array['Eventos','Producto','Corporativa','Edición profesional'], 4),
  ('publicidad-y-promocion', 'Publicidad y promoción',
   'Desarrollo de estrategias y materiales publicitarios que generan impacto.',
   'Creamos estrategias y materiales publicitarios orientados a dar visibilidad a tus productos y servicios, con mensajes claros y una presentación memorable.',
   array['Campañas','Material publicitario','Promociones','Lanzamientos'], 5)
on conflict (slug) do nothing;

insert into public.categories (slug, name, sort_order) values
  ('eventos', 'Eventos', 1),
  ('productos', 'Productos', 2),
  ('corporativo', 'Corporativo', 3),
  ('redes-sociales', 'Redes sociales', 4)
on conflict (slug) do nothing;

insert into public.institutional_content (kind, title, body, sort_order, published)
select * from (values
  ('about', 'Quiénes somos', 'MENA Marketing es una empresa especializada en ofrecer soluciones publicitarias y creativas para negocios, emprendimientos y marcas que buscan mejorar su presencia digital y fortalecer su identidad comercial.', 1, true),
  ('philosophy', 'Lo que hacemos', 'Nuestras actividades comprenden la asesoría estratégica de marketing, la administración de redes sociales, la producción de contenido gráfico y audiovisual, la fotografía profesional y el desarrollo de material publicitario.', 2, true),
  ('purpose', 'Nuestro propósito', 'Proporcionar servicios que permitan a nuestros clientes mejorar la comunicación de sus marcas y presentar sus productos, actividades y servicios de manera profesional.', 3, true),
  ('mission', 'Misión', 'Pendiente de aprobación por la empresa.', 4, false),
  ('vision', 'Visión', 'Pendiente de aprobación por la empresa.', 5, false),
  ('values', 'Valores', 'Pendiente de aprobación por la empresa.', 6, false)
) as v(kind, title, body, sort_order, published)
where not exists (select 1 from public.institutional_content);
