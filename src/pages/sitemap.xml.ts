import type { APIRoute } from 'astro';
import { getProjects, getServices } from '../lib/content';

export const GET: APIRoute = async ({ site, url, locals }) => {
	const base = site ?? url.origin;
	const sb = locals.supabase;
	const [services, projects] = await Promise.all([getServices(sb), getProjects(sb)]);
	const paths = [
		'/',
		'/nosotros',
		'/servicios',
		'/portafolio',
		'/contacto',
		'/privacidad',
		...services.map((s) => `/servicios/${s.slug}`),
		...projects.map((p) => `/portafolio/${p.slug}`),
	];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${new URL(p, base).href}</loc></url>`).join('\n')}
</urlset>`;
	return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
