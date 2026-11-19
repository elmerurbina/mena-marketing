// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || 'https://menamarketing.com',
	output: 'server',
	adapter: node({ mode: 'standalone' }),
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
