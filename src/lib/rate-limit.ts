/**
 * Limitador de frecuencia en memoria (por instancia del servidor).
 * Complementa el límite aplicado en la base de datos por correo electrónico.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max = 5, windowMs = 10 * 60 * 1000): boolean {
	const now = Date.now();
	const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
	if (list.length >= max) {
		hits.set(key, list);
		return false;
	}
	list.push(now);
	hits.set(key, list);
	if (hits.size > 5000) {
		for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
	}
	return true;
}
