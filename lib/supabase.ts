import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          name: string;
          avatar_url: string | null;
          is_verified: boolean;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          name: string;
          avatar_url?: string | null;
          is_verified?: boolean;
          rating?: number;
          created_at?: string;
        };
        Update: {
          phone?: string;
          name?: string;
          avatar_url?: string | null;
          is_verified?: boolean;
          rating?: number;
        };
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          departure: string;
          arrival: string;
          date: string;
          seats: number;
          price_fcfa: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          departure: string;
          arrival: string;
          date: string;
          seats: number;
          price_fcfa: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          type?: string;
          departure?: string;
          arrival?: string;
          date?: string;
          seats?: number;
          price_fcfa?: number;
          comment?: string | null;
        };
      };
      bookings: {
        Row: {
          id: string;
          trip_id: string;
          passenger_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          passenger_id: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          booking_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          reviewer_id: string;
          reviewed_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reviewer_id: string;
          reviewed_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          file_url: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          file_url: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          type?: string;
          file_url?: string;
          status?: string;
        };
      };
    };
  };
};
