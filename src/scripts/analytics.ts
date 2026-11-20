/* =====================================================================
   Analítica propia de MENA Marketing (sin cookies ni terceros).
   - ID de visitante anónimo y aleatorio en localStorage
   - Sesión: 30 minutos de inactividad
   - Respeta "Do Not Track" / Global Privacy Control
   ===================================================================== */

const SESSION_MS = 30 * 60 * 1000;

function uuid(): string {
	if (crypto.randomUUID) return crypto.randomUUID();
	return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
		(Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
	);
}

function store(kind: 'local' | 'session') {
	try {
		return kind === 'local' ? window.localStorage : window.sessionStorage;
	} catch {
		return null;
	}
}

function track() {
	const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
	if (nav.doNotTrack === '1' || nav.globalPrivacyControl || nav.webdriver) return;
	if (location.pathname.startsWith('/admin')) return;

	const ls = store('local');
	let isNew = false;
	let visitorId = ls?.getItem('mena_vid') ?? null;
	if (!visitorId) {
		visitorId = uuid();
		isNew = true;
		ls?.setItem('mena_vid', visitorId);
	}

	const now = Date.now();
	let sessionId = uuid();
	try {
		const prev = JSON.parse(ls?.getItem('mena_sid') ?? 'null') as { id: string; last: number } | null;
		if (prev && now - prev.last < SESSION_MS) sessionId = prev.id;
	} catch {}
	ls?.setItem('mena_sid', JSON.stringify({ id: sessionId, last: now }));

	const params = new URLSearchParams(location.search);
	const viewId = uuid();
	const payload = {
		id: viewId,
		path: location.pathname,
		title: document.title,
		referrer: document.referrer,
		visitor_id: visitorId,
		session_id: sessionId,
		is_new_visitor: isNew,
		utm_source: params.get('utm_source'),
		utm_medium: params.get('utm_medium'),
		utm_campaign: params.get('utm_campaign'),
		screen_w: window.screen?.width ?? null,
	};

	fetch('/api/track', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
		keepalive: true,
	}).catch(() => {});

	// Tiempo visible en la página
	let visibleMs = 0;
	let since = document.visibilityState === 'visible' ? performance.now() : 0;
	let sent = false;
	const flush = () => {
		if (since) visibleMs += performance.now() - since;
		since = 0;
		if (sent || visibleMs < 500) return;
		sent = true;
		ls?.setItem('mena_sid', JSON.stringify({ id: sessionId, last: Date.now() }));
		const body = JSON.stringify({ type: 'leave', id: viewId, duration_ms: Math.round(visibleMs) });
		const blob = new Blob([body], { type: 'application/json' });
		if (!navigator.sendBeacon?.('/api/track', blob)) {
			fetch('/api/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
		}
	};
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') flush();
		else if (!sent) since = performance.now();
	});
	window.addEventListener('pagehide', flush);
}

track();
