import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Project URL exacta
const SUPABASE_URL = 'https://dlwgvjlskgdgizgidpia.supabase.co';

// Llave anon / public 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2d2amxza2dkZ2l6Z2lkcGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTg3MzUsImV4cCI6MjEwNjM3NDczNX0.Y5KPfVEP855bM3t7wIssn_rN6Ip5thTwSN2xHNSSWek';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});