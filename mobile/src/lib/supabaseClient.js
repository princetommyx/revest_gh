import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Paste your actual URL and Anon Key here
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ykbpusfnqctwvhwirist.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_8Agone0GnoP-IJd-pjI2Cg_fvxPWvOC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // We disable local storage for auth since we are using anonymous
    // drops and mostly relying on the Django backend for true identity.
    // If you plan to fully migrate auth to Supabase, you would use AsyncStorage here.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
