import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = "https://mkykswfjbtafzirizcsb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1reWtzd2ZqYnRhZnppcml6Y3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjU3NTcsImV4cCI6MjA4ODIwMTc1N30.mDuD1Eb4Ejln-t_JuBvRTjFpE_Ph_jy08i66zjo1TlM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
