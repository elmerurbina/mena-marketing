import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category, Institutional, Project, Service, Settings } from './types';

/* ------------------------------------------------------------------
 * Contenido por defecto (tomado de la ERS v1.0).
 * Se usa mientras Supabase no esté configurado o si una consulta falla,
 * para que el sitio público siempre se muestre correctamente.
 * ------------------------------------------------------------------ */

export const defaultSettings: Settings = {
	name: 'MENA Marketing',
	tagline: 'Publicidad · Marketing · Fotografía',
	description:
		'Soluciones publicitarias y creativas para negocios, emprendimientos y marcas que buscan mejorar su presencia digital y fortalecer su identidad comercial.',
	hero_title: 'Marcas que se recuerdan.',
	hero_subtitle:
		'Estrategia, contenido y fotografía profesional para que tu marca comunique con la elegancia que merece.',
	hero_image: null,
	email: null,
	phone: null,
	whatsapp: null,
	whatsapp_message: 'Hola MENA Marketing, me gustaría solicitar información sobre sus servicios.',
	address: null,
	instagram: null,
	facebook: null,
	tiktok: null,
	linkedin: null,
	youtube: null,
	stat_projects: null,
	stat_clients: null,
	stat_years: null,
};

export const defaultInstitutional: Institutional[] = [
	{
		id: 'about',
		kind: 'about',
		title: 'Quiénes somos',
		body: 'MENA Marketing es una empresa especializada en ofrecer soluciones publicitarias y creativas para negocios, emprendimientos y marcas que buscan mejorar su presencia digital y fortalecer su identidad comercial.',
		sort_order: 1,
		published: true,
	},
	{
		id: 'philosophy',
		kind: 'philosophy',
		title: 'Lo que hacemos',
		body: 'Nuestras actividades comprenden la asesoría estratégica de marketing, la administración de redes sociales, la producción de contenido gráfico y audiovisual, la fotografía profesional y el desarrollo de material publicitario.',
		sort_order: 2,
		published: true,
	},
	{
		id: 'purpose',
		kind: 'purpose',
		title: 'Nuestro propósito',
		body: 'Proporcionar servicios que permitan a nuestros clientes mejorar la comunicación de sus marcas y presentar sus productos, actividades y servicios de manera profesional.',
		sort_order: 3,
		published: true,
	},
];

export const defaultServices: Service[] = [
	{
		id: 'asesoria-de-marketing',
		slug: 'asesoria-de-marketing',
		name: 'Asesoría de marketing',
		summary: 'Orientación estratégica para mejorar el posicionamiento y reconocimiento de tu marca.',
		description:
			'Analizamos tu marca, tu mercado y tus objetivos para trazar una ruta clara de posicionamiento. Te acompañamos en la toma de decisiones para que cada acción de comunicación sume al reconocimiento de tu negocio.',
		image_url: null,
		features: ['Diagnóstico de marca', 'Plan estratégico', 'Posicionamiento', 'Acompañamiento'],
		sort_order: 1,
		active: true,
	},
	{
		id: 'gestion-de-redes-sociales',
		slug: 'gestion-de-redes-sociales',
		name: 'Gestión de redes sociales',
		summary: 'Administración de perfiles comerciales y planificación de publicaciones.',
		description:
			'Nos encargamos de tus perfiles comerciales con una línea editorial coherente, calendarios de publicación y contenido pensado para conectar con tu audiencia.',
		image_url: null,
		features: ['Planificación de contenido', 'Calendario editorial', 'Administración de perfiles', 'Línea gráfica'],
		sort_order: 2,
		active: true,
	},
	{
		id: 'creacion-de-contenido',
		slug: 'creacion-de-contenido',
		name: 'Creación de contenido',
		summary: 'Producción de material gráfico y audiovisual con identidad propia.',
		description:
			'Diseñamos y producimos piezas gráficas y audiovisuales que comunican la esencia de tu marca con una estética cuidada y profesional.',
		image_url: null,
		features: ['Diseño gráfico', 'Producción audiovisual', 'Piezas para redes', 'Material promocional'],
		sort_order: 3,
		active: true,
	},
	{
		id: 'fotografia-profesional',
		slug: 'fotografia-profesional',
		name: 'Fotografía profesional',
		summary: 'Cobertura fotográfica de eventos, productos y actividades empresariales.',
		description:
			'Capturamos eventos, productos y actividades empresariales con una mirada profesional, cuidando la luz, la composición y cada detalle que distingue a tu marca.',
		image_url: null,
		features: ['Eventos', 'Producto', 'Corporativa', 'Edición profesional'],
		sort_order: 4,
		active: true,
	},
	{
		id: 'publicidad-y-promocion',
		slug: 'publicidad-y-promocion',
		name: 'Publicidad y promoción',
		summary: 'Desarrollo de estrategias y materiales publicitarios que generan impacto.',
		description:
			'Creamos estrategias y materiales publicitarios orientados a dar visibilidad a tus productos y servicios, con mensajes claros y una presentación memorable.',
		image_url: null,
		features: ['Campañas', 'Material publicitario', 'Promociones', 'Lanzamientos'],
		sort_order: 5,
		active: true,
	},
];

export const defaultCategories: Category[] = [
	{ id: 'eventos', slug: 'eventos', name: 'Eventos', description: null, active: true, sort_order: 1 },
	{ id: 'productos', slug: 'productos', name: 'Productos', description: null, active: true, sort_order: 2 },
	{ id: 'corporativo', slug: 'corporativo', name: 'Corporativo', description: null, active: true, sort_order: 3 },
	{ id: 'redes-sociales', slug: 'redes-sociales', name: 'Redes sociales', description: null, active: true, sort_order: 4 },
];

/* ------------------------------------------------------------------
 * Consultas públicas (solo contenido publicado; RLS lo garantiza también)
 * ------------------------------------------------------------------ */

type SB = SupabaseClient | null;

export async function getSettings(sb: SB): Promise<Settings> {
	if (!sb) return defaultSettings;
	const { data, error } = await sb.from('company_settings').select('*').eq('id', 1).maybeSingle();
	if (error || !data) return defaultSettings;
	const merged = { ...defaultSettings };
	for (const [k, v] of Object.entries(data)) {
		if (v !== null && v !== '' && k in merged) (merged as Record<string, unknown>)[k] = v;
	}
	return merged;
}

export async function getInstitutional(sb: SB): Promise<Institutional[]> {
	if (!sb) return defaultInstitutional;
	const { data, error } = await sb
		.from('institutional_content')
		.select('*')
		.eq('published', true)
		.order('sort_order');
	if (error || !data?.length) return defaultInstitutional;
	return data as Institutional[];
}

export async function getServices(sb: SB): Promise<Service[]> {
	if (!sb) return defaultServices;
	const { data, error } = await sb.from('services').select('*').eq('active', true).order('sort_order');
	if (error) return defaultServices;
	return (data ?? []) as Service[];
}

export async function getService(sb: SB, slug: string): Promise<Service | null> {
	if (!sb) return defaultServices.find((s) => s.slug === slug) ?? null;
	const { data } = await sb.from('services').select('*').eq('slug', slug).eq('active', true).maybeSingle();
	return (data as Service) ?? null;
}

export async function getCategories(sb: SB): Promise<Category[]> {
	if (!sb) return defaultCategories;
	const { data, error } = await sb.from('categories').select('*').eq('active', true).order('sort_order');
	if (error) return defaultCategories;
	return (data ?? []) as Category[];
}

export async function getProjects(sb: SB, opts: { featured?: boolean; limit?: number } = {}): Promise<Project[]> {
	if (!sb) return [];
	let q = sb
		.from('projects')
		.select('*, category:categories(*), photos(id,url,alt_text,sort_order,published)')
		.eq('published', true)
		.order('sort_order')
		.order('created_at', { ascending: false });
	if (opts.featured) q = q.eq('featured', true);
	if (opts.limit) q = q.limit(opts.limit);
	const { data, error } = await q;
	if (error) return [];
	return ((data ?? []) as Project[]).map(withCover);
}

export async function getProject(sb: SB, slug: string): Promise<Project | null> {
	if (!sb) return null;
	const { data } = await sb
		.from('projects')
		.select('*, category:categories(*), photos(*)')
		.eq('slug', slug)
		.eq('published', true)
		.maybeSingle();
	if (!data) return null;
	const project = data as Project;
	project.photos = (project.photos ?? []).filter((p) => p.published).sort((a, b) => a.sort_order - b.sort_order);
	return withCover(project);
}

function withCover(p: Project): Project {
	const photos = (p.photos ?? []).filter((ph) => ph.published !== false).sort((a, b) => a.sort_order - b.sort_order);
	return { ...p, photos, cover_url: p.cover_url || photos[0]?.url || null };
}
