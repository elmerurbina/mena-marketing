import type { APIRoute } from 'astro';
import { EMAIL_RE, bool, field } from '../../lib/utils';
import { rateLimit } from '../../lib/rate-limit';

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'message' | 'consent' | 'form', string>>;

export const POST: APIRoute = async ({ request, locals, clientAddress, redirect }) => {
	const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
	const reply = (status: number, body: { ok: boolean; message: string; errors?: Errors }) => {
		if (wantsJson) return Response.json(body, { status });
		const q = body.ok ? 'enviado=1' : `error=${encodeURIComponent(body.message)}`;
		return redirect(`/contacto?${q}#formulario`, 303);
	};

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return reply(400, { ok: false, message: 'No pudimos leer el formulario. Intenta nuevamente.' });
	}

	// Anti-spam: campo trampa + tiempo mínimo de llenado
	const honeypot = field(form, 'website');
	const startedAt = Number(field(form, 'ts', 20));
	if (honeypot || (Number.isFinite(startedAt) && Date.now() - startedAt < 2500)) {
		return reply(200, { ok: true, message: 'Gracias, recibimos tu solicitud.' });
	}

	let ip = 'unknown';
	try {
		ip = clientAddress;
	} catch {}
	if (!rateLimit(`contact:${ip}`)) {
		return reply(429, { ok: false, message: 'Has enviado varias solicitudes en poco tiempo. Intenta nuevamente en unos minutos.' });
	}

	const name = field(form, 'name', 120);
	const email = field(form, 'email', 160).toLowerCase();
	const phone = field(form, 'phone', 40);
	const serviceId = field(form, 'service', 64);
	const message = field(form, 'message', 3000);
	const consent = bool(form, 'consent');

	const errors: Errors = {};
	if (name.length < 2) errors.name = 'Ingresa tu nombre completo.';
	if (!email) errors.email = 'Ingresa tu correo electrónico.';
	else if (!EMAIL_RE.test(email)) errors.email = 'El correo electrónico no tiene un formato válido.';
	if (phone && !/^[+\d][\d\s()-]{6,}$/.test(phone)) errors.phone = 'El número de teléfono no es válido.';
	if (message.length < 10) errors.message = 'Describe tu solicitud (mínimo 10 caracteres).';
	if (!consent) errors.consent = 'Debes aceptar la política de privacidad para continuar.';

	if (Object.keys(errors).length) {
		return reply(422, { ok: false, message: 'Revisa los campos marcados.', errors });
	}

	const sb = locals.supabase;
	if (!sb) {
		return reply(503, { ok: false, message: 'El formulario no está disponible en este momento. Escríbenos por WhatsApp o correo.' });
	}

	// Resolver el servicio seleccionado (solo servicios activos)
	let service_id: string | null = null;
	let service_name: string | null = null;
	if (serviceId && /^[0-9a-f-]{36}$/i.test(serviceId)) {
		const { data } = await sb.from('services').select('id,name').eq('id', serviceId).eq('active', true).maybeSingle();
		if (data) {
			service_id = data.id;
			service_name = data.name;
		}
	} else if (serviceId === 'otro') {
		service_name = 'Otro / no estoy seguro';
	}

	const { error } = await sb.from('contact_requests').insert({
		name,
		email,
		phone: phone || null,
		service_id,
		service_name,
		message,
		consent,
	});

	if (error) {
		const tooMany = error.code === 'P0001';
		console.error('[contact] insert error', error.code, error.message);
		return reply(tooMany ? 429 : 500, {
			ok: false,
			message: tooMany
				? 'Ya recibimos varias solicitudes con este correo. Te contactaremos pronto.'
				: 'No pudimos registrar tu solicitud. Intenta nuevamente o contáctanos por WhatsApp.',
		});
	}

	return reply(200, { ok: true, message: '¡Gracias! Recibimos tu solicitud y te contactaremos muy pronto.' });
};
