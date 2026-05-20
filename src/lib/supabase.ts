import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://gnhwzbvlaqdnkahurlbv.supabase.co';
const supabaseAnonKey = 'sb_publishable_8hRhcIHmbeqGL7mh8bm0GQ_pnBrpnAc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit', // ✅ pkce → implicit
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: AsyncStorage as any,
  },
});