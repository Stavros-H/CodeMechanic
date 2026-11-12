import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Custom hook to create and memoize Supabase client
 * Can be used throughout the application for database operations
 */
export function useSupabaseClient(): SupabaseClient | null {
  const supabaseClient = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }, []);

  return supabaseClient;
}

/**
 * Get Supabase client without React hook (for non-component contexts)
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'Supabase is not configured. To enable authentication, please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file. Get these values from your Supabase project dashboard at https://app.supabase.com';
