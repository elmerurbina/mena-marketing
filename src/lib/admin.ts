import type { SupabaseClient } from '@supabase/supabase-js';
import { MEDIA_BUCKET } from './supabase';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, slugify } from './utils';

/** Redirección con mensaje flash en la URL (patrón POST → redirect → GET). */
export function back(url: URL, msg: { ok?: string; err?: string }, path?: string) {
	const target = new URL(path ?? url.pathname, url);
	if (msg.ok) target.searchParams.set('ok', msg.ok);
	if (msg.err) target.searchParams.set('err', msg.err);
	return new Response(null, { status: 303, headers: { Location: target.pathname + target.search } });
}

export function getFile(form: FormData, name: string): File | null {
	const f = form.get(name);
	return f instanceof File && f.size > 0 ? f : null;
}

export function getFiles(form: FormData, name: string): File[] {
	return form.getAll(name).filter((f): f is File => f instanceof File && f.size > 0);
}

export function validateImage(file: File): string | null {
	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return `"${file.name}" no es un formato permitido (JPG, PNG, WebP o AVIF).`;
	if (file.size > MAX_IMAGE_BYTES) return `"${file.name}" supera el tamaño máximo de 8 MB.`;
	return null;
}

/** Sube una imagen al bucket público "media" y devuelve su URL pública. */
export async function uploadImage(sb: SupabaseClient, file: File, folder: string) {
	const invalid = validateImage(file);
	if (invalid) return { error: invalid } as const;
	const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
	const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'imagen';
	const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${base}.${ext}`;
	const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, file, {
		contentType: file.type,
		cacheControl: '31536000',
		upsert: false,
	});
	if (error) return { error: `No se pudo subir "${file.name}": ${error.message}` } as const;
	const { data } = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
	return { url: data.publicUrl, path } as const;
}

/** Extrae la ruta interna del bucket a partir de una URL pública. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
	const i = url.indexOf(marker);
	return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

export async function removeFromStorage(sb: SupabaseClient, paths: (string | null | undefined)[]) {
	const clean = paths.filter((p): p is string => Boolean(p));
	if (clean.length) await sb.storage.from(MEDIA_BUCKET).remove(clean);
}

export function friendlyDbError(err: { code?: string; message: string }): string {
	if (err.code === '23505') return 'Ya existe un registro con ese identificador (slug). Usa otro nombre o slug.';
	if (err.code === '42501') return 'No tienes permisos para realizar esta operación.';
	if (err.code === '23503') return 'No se puede completar: el registro está relacionado con otros datos.';
	return `Ocurrió un error: ${err.message}`;
}
