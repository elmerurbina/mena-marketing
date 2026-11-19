import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('xxxx'));

/**
 * Cliente de Supabase ligado a la petición actual.
 * Usa la clave anónima + la sesión del usuario (cookies), por lo que
 * todas las operaciones quedan sujetas a las políticas RLS de la base de datos.
 */
export function createSupabase(request: Request, cookies: AstroCookies) {
	if (!isSupabaseConfigured) return null;
	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return parseCookieHeader(request.headers.get('Cookie') ?? '');
			},
			setAll(list) {
				for (const { name, value, options } of list) {
					try {
						cookies.set(name, value, { ...options, path: options?.path ?? '/' });
					} catch {
						/* la respuesta ya fue enviada */
					}
				}
			},
		},
	});
}

export const MEDIA_BUCKET = 'media';
