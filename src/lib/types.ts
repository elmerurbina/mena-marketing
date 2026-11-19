export type Role = 'admin' | 'editor';

export interface StaffMember {
	user_id: string;
	full_name: string | null;
	email: string | null;
	role: Role;
	active: boolean;
	created_at?: string;
}

export interface Settings {
	name: string;
	tagline: string;
	description: string;
	hero_title: string;
	hero_subtitle: string;
	hero_image: string | null;
	email: string | null;
	phone: string | null;
	whatsapp: string | null;
	whatsapp_message: string | null;
	address: string | null;
	instagram: string | null;
	facebook: string | null;
	tiktok: string | null;
	linkedin: string | null;
	youtube: string | null;
	stat_projects: number | null;
	stat_clients: number | null;
	stat_years: number | null;
}

export interface Institutional {
	id: string;
	kind: string;
	title: string;
	body: string;
	sort_order: number;
	published: boolean;
}

export interface Service {
	id: string;
	slug: string;
	name: string;
	summary: string;
	description: string;
	image_url: string | null;
	features: string[] | null;
	sort_order: number;
	active: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface Category {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	active: boolean;
	sort_order: number;
}

export interface Photo {
	id: string;
	project_id: string;
	storage_path: string | null;
	url: string;
	alt_text: string;
	description: string | null;
	sort_order: number;
	published: boolean;
	consent_confirmed: boolean;
	created_at?: string;
}

export interface Project {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	client: string | null;
	category_id: string | null;
	cover_url: string | null;
	featured: boolean;
	published: boolean;
	sort_order: number;
	created_at?: string;
	category?: Category | null;
	photos?: Photo[];
}

export type RequestStatus = 'nueva' | 'en_revision' | 'atendida' | 'cerrada';

export interface ContactRequest {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	service_id: string | null;
	service_name: string | null;
	message: string;
	consent: boolean;
	status: RequestStatus;
	notes: string | null;
	created_at: string;
	updated_at: string;
}
