import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals, redirect }) => {
	await locals.supabase?.auth.signOut();
	return redirect('/admin/login', 303);
};

export const GET: APIRoute = ({ redirect }) => redirect('/admin', 303);
