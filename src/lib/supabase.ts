/**
 * Supabase client — platform-aware storage (see ./authStorage).
 * Only the public URL and publishable (anon) key are present here.
 * The anon key is not secret; it is safe in the bundle only because RLS
 * enforces authorization server-side.
 */
import 'react-native-url-polyfill';
import { createClient } from '@supabase/supabase-js';
import { authStorage } from './authStorage';

export const SUPABASE_URL = "https://tgnzucqjebnisgrxjfjg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_DzI94YKcBeomrcWogOJPnQ__rOC7fMs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // required for the web OAuth callback flow
  },
});
