import type { RequestStatus, Settings } from './types';

export function slugify(input: string): string {
	return input
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export function whatsappLink(settings: Settings, message?: string): string | null {
	const digits = (settings.whatsapp ?? '').replace(/\D/g, '');
	if (!digits) return null;
	const text = message ?? settings.whatsapp_message ?? '';
	return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function formatDate(iso: string | undefined | null, withTime = false): string {
	if (!iso) return '—';
	return new Intl.DateTimeFormat('es', {
		dateStyle: 'medium',
		...(withTime ? { timeStyle: 'short' } : {}),
	}).format(new Date(iso));
}

export const statusLabels: Record<RequestStatus, string> = {
	nueva: 'Nueva',
	en_revision: 'En revisión',
	atendida: 'Atendida',
	cerrada: 'Cerrada',
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Lee un campo de texto de un FormData, recortado y limitado. */
export function field(form: FormData, name: string, max = 2000): string {
	const v = form.get(name);
	return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export function bool(form: FormData, name: string): boolean {
	const v = form.get(name);
	return v === 'on' || v === 'true' || v === '1';
}

export function int(form: FormData, name: string, fallback = 0): number {
	const n = Number.parseInt(field(form, name, 12), 10);
	return Number.isFinite(n) ? n : fallback;
}

export function socialLinks(s: Settings) {
	return [
		{ key: 'instagram', label: 'Instagram', url: s.instagram },
		{ key: 'facebook', label: 'Facebook', url: s.facebook },
		{ key: 'tiktok', label: 'TikTok', url: s.tiktok },
		{ key: 'linkedin', label: 'LinkedIn', url: s.linkedin },
		{ key: 'youtube', label: 'YouTube', url: s.youtube },
	].filter((l): l is { key: string; label: string; url: string } => Boolean(l.url));
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
