import { supabase } from '../supabase';

export type NativeUserType = 'artist' | 'guest';

export type RegisterUserData = {
  full_name: string;
  nickname: string;
  user_type: NativeUserType;
  phone?: string;
  website?: string;
  dob?: string;
  gender?: string;
};

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function checkEmailExists(email: string): Promise<{
  exists: boolean;
  available: boolean;
  error: unknown | null;
}> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email.trim())
      .single();

    if (data) {
      return { exists: true, available: false, error: null };
    }

    if (error && error.code === 'PGRST116') {
      return { exists: false, available: true, error: null };
    }

    if (error) {
      throw error;
    }

    return { exists: false, available: true, error: null };
  } catch (error) {
    console.error('[NativeAuth] checkEmailExists error:', error);
    return { exists: false, available: false, error };
  }
}

export async function registerUser(
  email: string,
  password: string,
  userData: RegisterUserData,
): Promise<{
  user: unknown | null;
  error: unknown | null;
}> {
  try {
    const normalizedEmail = email.trim();
    const metadata = {
      ...userData,
      full_name: userData.full_name,
      name: userData.full_name,
      nickname: userData.nickname,
      user_type: userData.user_type,
      phone: userData.phone,
      website: userData.website,
      dob: userData.dob,
      gender: userData.gender,
    };

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      throw error;
    }

    // The web signup flow asks the user to log in after registration. Keep the
    // native flow consistent even when Supabase returns an immediate session.
    await supabase.auth.signOut().catch(() => undefined);

    return { user: data.user ?? null, error: null };
  } catch (error) {
    console.error('[NativeAuth] registerUser error:', error);
    return { user: null, error };
  }
}
