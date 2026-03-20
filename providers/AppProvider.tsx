import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trip, TripType, Profile, SortType } from '@/types';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

const FAVORITES_KEY = 'faso_autostop_favorites';

function applySortToTrips(trips: Trip[], sort: SortType): Trip[] {
  switch (sort) {
    case 'price_asc':
      return [...trips].sort((a, b) => a.price_fcfa - b.price_fcfa);
    case 'price_desc':
      return [...trips].sort((a, b) => b.price_fcfa - a.price_fcfa);
    case 'seats':
      return [...trips].sort((a, b) => b.seats - a.seats);
    case 'recent':
    default:
      return trips;
  }
}

async function fetchTrips(): Promise<Trip[]> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*, profiles(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data ?? []) as Trip[];
  } catch {
    return [];
  }
}

async function fetchProfile(userId: string, userEmail?: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      const { data: newProfile, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: userEmail?.split('@')[0] ?? 'Utilisateur',
          phone: '',
          avatar_url: null,
          is_verified: false,
          rating: 5.0,
          total_trips: 0,
        })
        .select('*')
        .single();

      if (upsertError) {
        return null;
      }
      return newProfile as Profile;
    }

    if (error) {
      return null;
    }

    return data as Profile;
  } catch {
    return null;
  }
}

export const [AppProvider, useApp] = createContextHook(() => { // eslint-disable-line rork/general-context-optimization
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.log('[Auth] getSession error:', error.message);
          try { await supabase.auth.signOut(); } catch {}
          setSession(null);
        } else if (s) {
          try {
            const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
            if (!isMounted) return;
            if (refreshError || !refreshed) {
              console.log('[Auth] refreshSession failed:', refreshError?.message ?? 'no session');
              try { await supabase.auth.signOut(); } catch {}
              setSession(null);
            } else {
              setSession(refreshed);
            }
          } catch (refreshErr) {
            console.log('[Auth] refreshSession fetch error:', refreshErr);
            if (!isMounted) return;
            try { await supabase.auth.signOut(); } catch {}
            setSession(null);
          }
        } else {
          setSession(null);
        }
      } catch (err) {
        console.log('[Auth] getSession fetch error:', err);
        if (!isMounted) return;
        setSession(null);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    void initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('[Auth] onAuthStateChange:', event);
      if (event === 'TOKEN_REFRESHED' && !s) {
        console.log('[Auth] Token refresh failed, signing out');
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        return;
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        queryClient.clear();
        return;
      }
      setSession(s);
      if (s) {
        void queryClient.invalidateQueries({ queryKey: ['profile'] });
        void queryClient.invalidateQueries({ queryKey: ['trips'] });
        void queryClient.invalidateQueries({ queryKey: ['userTripsCount'] });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user?.id ?? null;

  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
    staleTime: 30000,
    retry: 1,
  });

  const userEmail = session?.user?.email ?? undefined;

  const profileQuery = useQuery({
    queryKey: ['profile', userId, userEmail],
    queryFn: () => fetchProfile(userId!, userEmail),
    enabled: !!userId,
    staleTime: 60000,
    retry: 2,
  });

  const userTripsCountQuery = useQuery({
    queryKey: ['userTripsCount', userId],
    queryFn: async () => {
      if (!userId) return 0;
      try {
        const { count, error } = await supabase
          .from('trips')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (error) {
          return 0;
        }
        return count ?? 0;
      } catch {
        return 0;
      }
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const createTripMutation = useMutation({
    mutationFn: async (tripData: {
      type: TripType;
      departure: string;
      arrival: string;
      trip_date: string;
      trip_time: string;
      seats: number;
      price_fcfa: number;
      comment: string | null;
    }) => {
      if (!userId) throw new Error('Non connecté');

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          type: tripData.type,
          departure: tripData.departure,
          arrival: tripData.arrival,
          trip_date: tripData.trip_date,
          trip_time: tripData.trip_time,
          seats: tripData.seats,
          price_fcfa: tripData.price_fcfa,
          comment: tripData.comment,
          status: 'active',
        })
        .select('*, profiles(*)')
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['userTripsCount'] });
    },
  });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const trips: Trip[] = useMemo(() => {
    return tripsQuery.data ?? [];
  }, [tripsQuery.data]);

  const profile: Profile | null = useMemo(() => {
    return profileQuery.data ?? null;
  }, [profileQuery.data]);

  const userTripsCount = userTripsCountQuery.data ?? 0;

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavs = await AsyncStorage.getItem(FAVORITES_KEY);
        if (storedFavs) {
          setFavorites(JSON.parse(storedFavs) as string[]);
        }
      } catch {
      }
    };
    void loadFavorites();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (_payload) => {
        void queryClient.invalidateQueries({ queryKey: ['trips'] });
        void queryClient.invalidateQueries({ queryKey: ['userTripsCount'] });
      })
      .subscribe((_status) => {
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const toggleFavorite = useCallback((tripId: string) => {
    setFavorites(prev => {
      const updated = prev.includes(tripId)
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated)).catch(() => {
      });
      return updated;
    });
  }, []);

  const isFavorite = useCallback((tripId: string) => {
    return favorites.includes(tripId);
  }, [favorites]);

  const { refetch: refetchTripsQuery } = tripsQuery;

  const refetchTrips = useCallback(async () => {
    setIsSyncing(true);
    try {
      await refetchTripsQuery();
    } finally {
      setIsSyncing(false);
    }
  }, [refetchTripsQuery]);

  return {
    session,
    userId,
    authLoading,
    trips,
    profile,
    userTripsCount,
    isSyncing,
    favorites,
    createTripMutation,
    signOut,
    toggleFavorite,
    isFavorite,
    setIsSyncing,
    isLoading: tripsQuery.isLoading,
    profileLoading: profileQuery.isLoading,
    profileError: profileQuery.isError,
    isPublishing: createTripMutation.isPending,
    refetchTrips,
    refetchProfile: profileQuery.refetch,
  };
});

export function useFilteredTrips(filter: TripType | 'all', sort: SortType = 'recent') {
  const { trips } = useApp();
  return useMemo(() => {
    let filtered = filter === 'all' ? trips : trips.filter(t => t.type === filter);
    return applySortToTrips(filtered, sort);
  }, [trips, filter, sort]);
}

export function useSearchTrips(query: string, type: TripType | 'all', sort: SortType = 'recent') {
  const { trips } = useApp();
  return useMemo(() => {
    let filtered = trips;
    if (type !== 'all') {
      filtered = filtered.filter(t => t.type === type);
    }
    if (query.trim()) {
      const lower = query.toLowerCase();
      filtered = filtered.filter(t =>
        t.departure.toLowerCase().includes(lower) ||
        t.arrival.toLowerCase().includes(lower) ||
        (t.profiles?.full_name ?? '').toLowerCase().includes(lower)
      );
    }
    return applySortToTrips(filtered, sort);
  }, [trips, query, type, sort]);
}
