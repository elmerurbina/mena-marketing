/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_SUPABASE_URL: string;
	readonly PUBLIC_SUPABASE_ANON_KEY: string;
	readonly SITE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals {
		supabase: import('@supabase/supabase-js').SupabaseClient | null;
		user: import('@supabase/supabase-js').User | null;
		staff: import('./lib/types').StaffMember | null;
	}
}
