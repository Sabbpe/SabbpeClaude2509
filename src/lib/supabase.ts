// src/lib/supabase.ts - Supabase Client Configuration

import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Your Supabase project credentials
const supabaseUrl = 'https://grbbtgfvgwxtkgxtakug.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYmJ0Z2Z2Z3d4dGtneHRha3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjEwNjcsImV4cCI6MjA3MjczNzA2N30.WfYhnPAFdBw-WZqZe95qSfk2OD9tUDw_iH9eyxgTjC4';

// Create the Supabase client with TypeScript types
export const supabase = createClient < Database > (supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

// Optional: Helper functions for common operations
export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

// Export types for use in components
export type { Database } from './database.types';