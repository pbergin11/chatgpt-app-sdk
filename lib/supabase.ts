/**
 * Supabase Client Configuration
 * 
 * This file sets up the Supabase client for querying the golf courses database.
 * 
 * IMPORTANT: This uses the service role key and should ONLY be used server-side
 * (API routes, server components, server actions).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

// Create Supabase client with service role key for server-side queries
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Type definitions matching your Supabase schema
export interface SupabaseCourse {
  idx: number;
  id: string;
  course_name: string;
  slug: string;
  igolf_id: string | null;
  provider: string | null;
  provider_id: string | null;
  google_place_id: string | null;
  status: string;
  type: string;
  location: string; // PostGIS geography point
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  street: string | null;
  geocode_source: string | null;
  geocode_confidence: string | null;
  geocoded_at: string | null;
  holes: number | null;
  par_total: number | null;
  yardage_total: number | null;
  year_opened: number | null;
  course_style: string | null;
  walk_rate_min: string | null;
  walk_rate_max: string | null;
  cart_rate_min: string | null;
  cart_rate_max: string | null;
  currency: string | null;
  amenities: string[] | null;
  verified: boolean;
  verification_date: string | null;
  top_public: boolean;
  top_resort: boolean;
  best_in_state: boolean;
  top_usa: boolean;
  top_world: boolean;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  data: any; // JSONB field with full course data
  source: string | null;
  updated_at: string;
  created_at: string;
  lat: number;
  lon: number;
}
