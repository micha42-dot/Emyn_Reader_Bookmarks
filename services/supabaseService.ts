import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey: string | null = null;

export const getSupabase = (url: string, key: string): SupabaseClient => {
  // Simple singleton pattern to reuse client if config hasn't changed
  const configKey = `${url}:${key}`;
  
  if (supabaseInstance && currentConfigKey === configKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, key);
    currentConfigKey = configKey;
    return supabaseInstance;
  } catch (error) {
    throw new Error('Invalid Supabase Configuration');
  }
};

export const clearSupabaseInstance = () => {
    supabaseInstance = null;
    currentConfigKey = null;
};
