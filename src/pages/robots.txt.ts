import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site, url }) => {
	const base = site ?? url.origin;
	const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: ${new URL('/sitemap.xml', base).href}\n`;
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
