import type { APIRoute } from 'astro';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch/i;

function device(ua: string): string {
	if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'Tablet';
	if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)) return 'Móvil';
	return 'Escritorio';
}

function browser(ua: string): string {
	if (/Edg\//.test(ua)) return 'Edge';
	if (/OPR\/|Opera/.test(ua)) return 'Opera';
	if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
	if (/Instagram/.test(ua)) return 'Instagram';
	if (/FBAN|FBAV/.test(ua)) return 'Facebook';
	if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
	if (/Chrome|CriOS/.test(ua)) return 'Chrome';
	if (/Safari/.test(ua)) return 'Safari';
	return 'Otro';
}

function os(ua: string): string {
	if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
	if (/Android/.test(ua)) return 'Android';
	if (/Windows/.test(ua)) return 'Windows';
	if (/CrOS/.test(ua)) return 'ChromeOS';
	if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
	if (/Linux/.test(ua)) return 'Linux';
	return 'Otro';
}

function header(request: Request, name: string): string | null {
	const v = request.headers.get(name);
	if (!v) return null;
	try {
		return decodeURIComponent(v);
	} catch {
		return v;
	}
}

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export const POST: APIRoute = async ({ request, locals, url }) => {
	const noContent = () => new Response(null, { status: 204 });
	const sb = locals.supabase;
	if (!sb) return noContent();

	const ua = request.headers.get('user-agent') ?? '';
	if (!ua || BOT_RE.test(ua)) return noContent();

	const raw = await request.text().catch(() => '');
	if (!raw || raw.length > 4000) return noContent();
	let body: Record<string, unknown>;
	try {
		body = JSON.parse(raw);
	} catch {
		return noContent();
	}
	if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return noContent();

	if (body.type === 'leave') {
		const ms = Number(body.duration_ms);
		if (Number.isFinite(ms) && ms > 0) await sb.rpc('track_leave', { p_id: body.id, p_duration_ms: Math.round(ms) });
		return noContent();
	}

	const path = str(body.path, 300);
	if (!path || !path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) return noContent();

	let referrerHost: string | null = null;
	const ref = str(body.referrer, 500);
	if (ref) {
		try {
			const host = new URL(ref).hostname.replace(/^www\./, '');
			if (host && host !== url.hostname.replace(/^www\./, '')) referrerHost = host;
		} catch {}
	}

	await sb.rpc('track_pageview', {
		p: {
			id: body.id,
			path,
			title: str(body.title, 200),
			referrer_host: referrerHost,
			visitor_id: str(body.visitor_id, 64),
			session_id: str(body.session_id, 64),
			is_new_visitor: body.is_new_visitor === true,
			// Geolocalización aproximada proporcionada por Vercel (no se guarda la IP)
			country: header(request, 'x-vercel-ip-country'),
			region: header(request, 'x-vercel-ip-country-region'),
			city: header(request, 'x-vercel-ip-city'),
			device: device(ua),
			browser: browser(ua),
			os: os(ua),
			utm_source: str(body.utm_source, 100),
			utm_medium: str(body.utm_medium, 100),
			utm_campaign: str(body.utm_campaign, 100),
			screen_w: typeof body.screen_w === 'number' ? Math.round(body.screen_w) : null,
		},
	});

	return noContent();
};
