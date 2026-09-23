/* Picks the backend: Supabase when configured via env, otherwise browser-local storage. */
import { createSupabaseBackend } from './supabase.js';
import { createLocalBackend } from './local.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const backend = url && key ? createSupabaseBackend(url, key) : createLocalBackend();
export const isLive = backend.mode === 'supabase';
