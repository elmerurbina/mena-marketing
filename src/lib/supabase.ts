import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from 'astro:env/server';

const url = SUPABASE_URL ?? '';
const anonKey = SUPABASE_ANON_KEY ?? '';

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
