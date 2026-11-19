/* =====================================================================
   MENA Marketing · Motor de animaciones
   GSAP + ScrollTrigger + Lenis (scroll suave)
   ===================================================================== */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE = 'expo.out';

let lenis: Lenis | null = null;

/* ---------------------------------------------------------------------
 * Scroll suave
 * ------------------------------------------------------------------- */
function initLenis() {
	if (reduced) return;
	lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add((time) => lenis?.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);

	// Inclinación sutil según la velocidad del scroll
	const skewEls = gsap.utils.toArray<HTMLElement>('[data-skew]');
	if (skewEls.length) {
		const setters = skewEls.map((el) => gsap.quickTo(el, 'skewY', { duration: 0.6, ease: 'power3' }));
		lenis.on('scroll', ({ velocity }: { velocity: number }) => {
			const s = gsap.utils.clamp(-4, 4, velocity * 0.25);
			setters.forEach((set) => set(s));
		});
	}
}

/* ---------------------------------------------------------------------
 * Encabezado: oculto al bajar, visible al subir
 * ------------------------------------------------------------------- */
function initHeader() {
	const header = document.querySelector<HTMLElement>('[data-header]');
	if (!header) return;
	let last = 0;
	const onScroll = () => {
		const y = window.scrollY;
		header.classList.toggle('is-scrolled', y > 40);
		if (!root.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > last && y > 320);
		last = y;
	};
	window.addEventListener('scroll', onScroll, { passive: true });
	onScroll();

	const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
	const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
	if (!toggle || !menu) return;
	const links = menu.querySelectorAll<HTMLAnchorElement>('a');
	const setOpen = (open: boolean) => {
		root.classList.toggle('menu-open', open);
		toggle.setAttribute('aria-expanded', String(open));
		toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
		menu.setAttribute('aria-hidden', String(!open));
		links.forEach((a) => (a.tabIndex = open ? 0 : -1));
		if (open) lenis?.stop();
		else lenis?.start();
	};
	toggle.addEventListener('click', () => setOpen(!root.classList.contains('menu-open')));
	document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
}

/* ---------------------------------------------------------------------
 * División de texto en palabras (para revelados tipográficos)
 * ------------------------------------------------------------------- */
const GRADIENT_CLASSES = ['text-gold', 'text-purple'];

function splitWords(el: HTMLElement): HTMLElement[] {
	const words: HTMLElement[] = [];
	const walk = (node: Node, inherit: string[]) => {
		Array.from(node.childNodes).forEach((child) => {
			if (child.nodeType === Node.TEXT_NODE) {
				const parts = (child.textContent ?? '').split(/(\s+)/);
				const frag = document.createDocumentFragment();
				parts.forEach((part) => {
					if (!part) return;
					if (/^\s+$/.test(part)) {
						frag.appendChild(document.createTextNode(' '));
						return;
					}
					const line = document.createElement('span');
					line.className = 'split-line';
					line.style.display = 'inline-block';
					const w = document.createElement('span');
					w.className = ['split-word', ...inherit].join(' ');
					w.textContent = part;
					line.appendChild(w);
					frag.appendChild(line);
					words.push(w);
				});
				child.replaceWith(frag);
			} else if (child instanceof HTMLElement) {
				if (child.tagName === 'BR') return;
				const grad = GRADIENT_CLASSES.filter((c) => child.classList.contains(c));
				grad.forEach((c) => child.classList.remove(c));
				walk(child, [...inherit, ...grad]);
			}
		});
	};
	el.setAttribute('aria-label', el.textContent?.replace(/\s+/g, ' ').trim() ?? '');
	walk(el, []);
	el.querySelectorAll('.split-line').forEach((s) => s.setAttribute('aria-hidden', 'true'));
	return words;
}

/* ---------------------------------------------------------------------
 * Animaciones de entrada del hero (tras el preloader)
 * ------------------------------------------------------------------- */
function heroIntro() {
	const tl = gsap.timeline({ defaults: { ease: EASE } });
	document.querySelectorAll<HTMLElement>('[data-split="hero"]').forEach((el, i) => {
		const words = splitWords(el);
		tl.from(words, { yPercent: 115, rotate: 5, duration: 1.6, stagger: 0.06 }, 0.1 + i * 0.15);
	});
	const items = gsap.utils.toArray<HTMLElement>('[data-hero]');
	if (items.length) tl.fromTo(items, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.4, stagger: 0.1 }, 0.5);
	const media = gsap.utils.toArray<HTMLElement>('[data-hero-media]');
	if (media.length) {
		tl.fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'expo.inOut', stagger: 0.12 }, 0.2);
	}
	return tl;
}

/* ---------------------------------------------------------------------
 * Animaciones ligadas al scroll
 * ------------------------------------------------------------------- */
function initScroll() {
	// Títulos divididos en palabras
	document.querySelectorAll<HTMLElement>('[data-split]:not([data-split="hero"])').forEach((el) => {
		const words = splitWords(el);
		gsap.from(words, {
			yPercent: 115,
			rotate: 4,
			duration: 1.4,
			ease: EASE,
			stagger: 0.045,
			scrollTrigger: { trigger: el, start: 'top 88%' },
		});
	});

	// Revelados en lote con escalonado
	ScrollTrigger.batch('[data-reveal]', {
		start: 'top 90%',
		once: true,
		onEnter: (batch) =>
			gsap.to(batch, { opacity: 1, y: 0, duration: 1.3, ease: EASE, stagger: 0.12, overwrite: true }),
	});

	// Imágenes con cortina
	gsap.utils.toArray<HTMLElement>('[data-img-reveal]').forEach((el) => {
		const inner = el.firstElementChild as HTMLElement | null;
		const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%' } });
		tl.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' });
		if (inner) tl.fromTo(inner, { scale: 1.35 }, { scale: 1, duration: 2, ease: EASE }, 0);
	});

	// Parallax
	gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
		const amount = Number(el.dataset.parallax || 0.15);
		gsap.fromTo(
			el,
			{ yPercent: -amount * 100 },
			{ yPercent: amount * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true } },
		);
	});

	// Contadores
	gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
		const end = Number(el.dataset.count);
		if (!Number.isFinite(end)) return;
		const obj = { v: 0 };
		gsap.to(obj, {
			v: end,
			duration: 2.4,
			ease: 'power3.out',
			scrollTrigger: { trigger: el, start: 'top 90%' },
			onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString('es')),
		});
	});

	// Líneas que se dibujan
	gsap.utils.toArray<HTMLElement>('[data-line]').forEach((el) => {
		gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 92%' } });
	});

	// Scroll horizontal fijado (escritorio)
	const mm = gsap.matchMedia();
	mm.add('(min-width: 1024px)', () => {
		gsap.utils.toArray<HTMLElement>('[data-hscroll]').forEach((section) => {
			const track = section.querySelector<HTMLElement>('[data-hscroll-track]');
			if (!track) return;
			const distance = () => track.scrollWidth - window.innerWidth + 80;
			gsap.to(track, {
				x: () => -distance(),
				ease: 'none',
				scrollTrigger: {
					trigger: section,
					start: 'top top',
					end: () => `+=${distance()}`,
					pin: true,
					scrub: 1,
					invalidateOnRefresh: true,
					anticipatePin: 1,
				},
			});
			const bar = section.querySelector<HTMLElement>('[data-hscroll-progress]');
			if (bar) {
				gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, scrub: true } });
			}
		});
	});
}

/* ---------------------------------------------------------------------
 * Interacciones de puntero: cursor, magnetismo, inclinación 3D
 * ------------------------------------------------------------------- */
function initPointer() {
	if (!finePointer || reduced) return;

	const cursor = document.querySelector<HTMLElement>('[data-cursor-el]');
	if (cursor) {
		const dot = cursor.querySelector<HTMLElement>('.cursor-dot')!;
		const ring = cursor.querySelector<HTMLElement>('.cursor-ring')!;
		const label = cursor.querySelector<HTMLElement>('.cursor-label')!;
		root.classList.add('has-cursor');
		const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
		const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
		const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
		const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
		window.addEventListener('pointermove', (e) => {
			dx(e.clientX);
			dy(e.clientY);
			rx(e.clientX);
			ry(e.clientY);
			cursor.classList.add('is-visible');
		});
		document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
		document.addEventListener('pointerover', (e) => {
			const t = (e.target as HTMLElement).closest<HTMLElement>('a, button, [data-cursor], input, textarea, select, label');
			cursor.classList.toggle('is-hover', Boolean(t));
			const text = t?.closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? '';
			label.textContent = text;
			cursor.classList.toggle('has-label', Boolean(text));
		});
		window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
		window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
	}

	document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
		const strength = Number(el.dataset.magnetic || 0.35) || 0.35;
		const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
		const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
		el.addEventListener('pointermove', (e) => {
			const r = el.getBoundingClientRect();
			xTo((e.clientX - (r.left + r.width / 2)) * strength);
			yTo((e.clientY - (r.top + r.height / 2)) * strength);
		});
		el.addEventListener('pointerleave', () => {
			xTo(0);
			yTo(0);
		});
	});

	document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
		gsap.set(el, { transformPerspective: 1000 });
		const rX = gsap.quickTo(el, 'rotationX', { duration: 0.9, ease: 'power3' });
		const rY = gsap.quickTo(el, 'rotationY', { duration: 0.9, ease: 'power3' });
		el.addEventListener('pointermove', (e) => {
			const r = el.getBoundingClientRect();
			const px = (e.clientX - r.left) / r.width - 0.5;
			const py = (e.clientY - r.top) / r.height - 0.5;
			rY(px * 8);
			rX(-py * 8);
			el.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
			el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
		});
		el.addEventListener('pointerleave', () => {
			rX(0);
			rY(0);
		});
	});
}

/* ---------------------------------------------------------------------
 * Transiciones entre páginas (cortina dorada)
 * ------------------------------------------------------------------- */
function initPageTransitions() {
	const curtain = document.querySelector<HTMLElement>('[data-page-curtain]');
	if (!curtain) return;

	// Entrada
	gsap.fromTo(curtain, { scaleY: 1, transformOrigin: 'top' }, { scaleY: 0, duration: 1.1, ease: 'expo.inOut', delay: 0.05 });

	if (reduced) return;
	document.addEventListener('click', (e) => {
		const a = (e.target as HTMLElement).closest('a');
		if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		if (a.target === '_blank' || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return;
		const url = new URL(a.href, location.href);
		if (url.origin !== location.origin || url.pathname.startsWith('/admin')) return;
		if (url.pathname === location.pathname && url.hash) return;
		if (url.href === location.href) return;
		e.preventDefault();
		root.classList.remove('menu-open');
		gsap.fromTo(
			curtain,
			{ scaleY: 0, transformOrigin: 'bottom' },
			{ scaleY: 1, duration: 0.8, ease: 'expo.inOut', onComplete: () => (location.href = url.href) },
		);
	});
	// Restaurar al volver con el botón "atrás" (bfcache)
	window.addEventListener('pageshow', (e) => {
		if (e.persisted) gsap.set(curtain, { scaleY: 0 });
	});
}

/* ---------------------------------------------------------------------
 * Preloader
 * ------------------------------------------------------------------- */
function runPreloader(): Promise<void> {
	const el = document.querySelector<HTMLElement>('[data-preloader]');
	if (!el || root.classList.contains('skip-preloader') || reduced) {
		el?.remove();
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		const bar = el.querySelector<HTMLElement>('[data-preloader-bar]');
		const count = el.querySelector<HTMLElement>('[data-preloader-count]');
		const curtainEl = el.querySelector<HTMLElement>('.preloader-curtain');
		const inner = el.querySelector<HTMLElement>('.preloader-inner');
		const obj = { p: 0 };
		lenis?.stop();
		const tl = gsap.timeline({
			onComplete: () => {
				try {
					sessionStorage.setItem('mena-loaded', '1');
				} catch {}
				el.remove();
				lenis?.start();
			},
		});
		tl.to(obj, {
			p: 100,
			duration: 2,
			ease: 'power2.inOut',
			onUpdate: () => {
				if (count) count.textContent = String(Math.round(obj.p));
				if (bar) bar.style.transform = `scaleX(${obj.p / 100})`;
			},
		})
			.to(inner, { opacity: 0, y: -30, duration: 0.6, ease: 'power3.in' })
			.to(curtainEl, { scaleY: 1, duration: 0.7, ease: 'expo.inOut' }, '-=0.2')
			.set(el, { background: 'transparent' })
			.to(curtainEl, { scaleY: 0, transformOrigin: 'top', duration: 0.9, ease: 'expo.inOut' })
			.add(() => resolve(), '-=0.75');
	});
}

/* ---------------------------------------------------------------------
 * Varios
 * ------------------------------------------------------------------- */
function initMisc() {
	document.querySelectorAll<HTMLElement>('[data-to-top]').forEach((b) =>
		b.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0, behavior: 'smooth' }))),
	);
	// Anclas internas con scroll suave
	document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
		a.addEventListener('click', (e) => {
			const id = a.getAttribute('href')!;
			const target = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
			if (!target) return;
			e.preventDefault();
			lenis ? lenis.scrollTo(target, { offset: -80 }) : target.scrollIntoView({ behavior: 'smooth' });
		}),
	);
}

/* ---------------------------------------------------------------------
 * Arranque
 * ------------------------------------------------------------------- */
async function boot() {
	initHeader();
	initMisc();
	if (reduced) {
		root.classList.add('no-motion');
		document.querySelector('[data-preloader]')?.remove();
		gsap.set('[data-page-curtain]', { scaleY: 0 });
		return;
	}
	initLenis();
	initPageTransitions();
	initPointer();
	await runPreloader();
	heroIntro();
	initScroll();
	window.addEventListener('load', () => ScrollTrigger.refresh());
}

boot();

export { gsap, ScrollTrigger };
export const getLenis = () => lenis;
