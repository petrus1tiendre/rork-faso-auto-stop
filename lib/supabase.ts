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
