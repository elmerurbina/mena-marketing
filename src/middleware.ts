import { defineMiddleware } from 'astro:middleware';
import { createSupabase } from './lib/supabase';
import type { StaffMember } from './lib/types';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/logout'];

function secure(response: Response): Response {
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { request, cookies, url, locals, redirect } = context;
	locals.supabase = createSupabase(request, cookies);
	locals.user = null;
	locals.staff = null;

	const isAdminArea = url.pathname === '/admin' || url.pathname.startsWith('/admin/');
	if (!isAdminArea) return secure(await next());

	const sb = locals.supabase;
	if (sb) {
		// getUser() valida el token contra Supabase Auth (no confía solo en la cookie)
		const { data } = await sb.auth.getUser();
		if (data.user) {
			locals.user = data.user;
			const { data: staff } = await sb
				.from('admin_users')
				.select('user_id, full_name, email, role, active, created_at')
				.eq('user_id', data.user.id)
				.maybeSingle();
			if (staff?.active) locals.staff = staff as StaffMember;
		}
	}

	if (PUBLIC_ADMIN_PATHS.includes(url.pathname)) {
		if (url.pathname === '/admin/login' && locals.staff) return redirect('/admin');
		return secure(await next());
	}

	if (!locals.staff) {
		// Usuario autenticado pero sin autorización explícita: cerrar sesión
		if (locals.user && sb) await sb.auth.signOut();
		const reason = locals.user ? '?error=unauthorized' : '';
		return redirect(`/admin/login${reason}`);
	}

	const response = secure(await next());
	response.headers.set('Cache-Control', 'no-store');
	response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	return response;
});
