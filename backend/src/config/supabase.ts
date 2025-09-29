import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Database } from '../lib/database.types.js'; // correct relative path

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role key for backend

export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Optional helper functions
export const getMerchantByUserId = async (userId: string) => {
    const { data, error } = await supabase
        .from('merchant_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error) throw error;
    return data;
};

export type { Database };
