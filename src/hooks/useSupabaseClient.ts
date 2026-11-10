import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Custom hook to create and memoize Supabase client
 * Can be used throughout the application for database operations
 */
export function useSupabaseClient(): SupabaseClient {
  const supabaseClient = useMemo(() => {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }, []);

  return supabaseClient;
}

/**
 * Get Supabase client without React hook (for non-component contexts)
 */
export function getSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
