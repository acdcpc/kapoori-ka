/**
 * Supabase client — platform-aware storage (see ./authStorage).
 * Only the public URL and publishable (anon) key are present here.
 */
import 'react-native-url-polyfill';
import { createClient } from '@supabase/supabase-js';
import { authStorage } from './authStorage';

const supabaseUrl = "https://tgnzucqjebnisgrxjfjg.supabase.co";
const supabaseAnonKey = "sb_publishable_DzI94YKcBeomrcWogOJPnQ__rOC7fMs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // required for the web OAuth callback flow
  },
});
