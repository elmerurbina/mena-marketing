// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || 'https://mena-marketing.vercel.app',
	output: 'server',
	adapter: vercel(),
	env: {
		schema: {
			// Se leen en tiempo de ejecución en el servidor (nunca se envían al navegador)
			SUPABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
			SUPABASE_ANON_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
			SITE_URL: envField.string({ context: 'server', access: 'public', optional: true }),
		},
	},
	security: {
		// Protección CSRF para formularios (RNF-008)
		checkOrigin: true,
	},
	prefetch: {
		prefetchAll: false,
		defaultStrategy: 'hover',
	},
	devToolbar: { enabled: false },
});
