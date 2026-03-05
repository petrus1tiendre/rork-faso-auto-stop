import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trip, TripType, Profile } from '@/types';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

const FAVORITES_KEY = 'faso_autostop_favorites';

async function fetchTrips(): Promise<Trip[]> {
  console.log('[AppProvider] Fetching trips from Supabase...');
  const { data, error } = await supabase
    .from('trips')
    .select('*, profiles(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.log('[AppProvider] Supabase trips error:', error.message);
    throw error;
  }

  console.log('[AppProvider] Fetched trips:', data?.length ?? 0);
  return (data ?? []) as Trip[];
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  console.log('[AppProvider] Fetching profile for:', userId);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.log('[AppProvider] Profile fetch error:', error.message);
    return null;
  }

  return data as Profile;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    console.log('[AppProvider] Checking initial session...');
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[AppProvider] Initial session:', s ? 'found' : 'none');
      setSession(s);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log('[AppProvider] Auth state changed:', _event);
      setSession(s);
      if (s) {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
      }
    });

    return () => {
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

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 60000,
    retry: 1,
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
        console.log('[AppProvider] Insert trip error:', error.message);
        throw error;
      }
      console.log('[AppProvider] Trip created:', data?.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const signOut = useCallback(async () => {
    console.log('[AppProvider] Signing out...');
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const trips: Trip[] = useMemo(() => {
    return tripsQuery.data ?? [];
  }, [tripsQuery.data]);

  const profile: Profile | null = useMemo(() => {
    return profileQuery.data ?? null;
  }, [profileQuery.data]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavs = await AsyncStorage.getItem(FAVORITES_KEY);
        if (storedFavs) {
          setFavorites(JSON.parse(storedFavs) as string[]);
        }
      } catch (e) {
        console.log('[AppProvider] Failed to load favorites:', e);
      }
    };
    loadFavorites();
  }, []);

  useEffect(() => {
    if (tripsQuery.isError) {
      setIsOffline(true);
    } else if (tripsQuery.isSuccess) {
      setIsOffline(false);
    }
  }, [tripsQuery.isError, tripsQuery.isSuccess]);

  useEffect(() => {
    const channel = supabase
      .channel('trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        console.log('[AppProvider] Realtime trip change:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['trips'] });
      })
      .subscribe((status) => {
        console.log('[AppProvider] Realtime subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const toggleFavorite = useCallback((tripId: string) => {
    setFavorites(prev => {
      const updated = prev.includes(tripId)
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated)).catch(e => {
        console.log('[AppProvider] Failed to save favorites:', e);
      });
      return updated;
    });
  }, []);

  const isFavorite = useCallback((tripId: string) => {
    return favorites.includes(tripId);
  }, [favorites]);

  const { refetch: refetchTripsQuery } = tripsQuery;

  const refetchTrips = useCallback(() => {
    setIsSyncing(true);
    refetchTripsQuery().finally(() => setIsSyncing(false));
  }, [refetchTripsQuery]);

  return {
    session,
    userId,
    authLoading,
    trips,
    profile,
    isOffline,
    isSyncing,
    favorites,
    createTripMutation,
    signOut,
    toggleFavorite,
    isFavorite,
    setIsOffline,
    setIsSyncing,
    isLoading: tripsQuery.isLoading,
    isPublishing: createTripMutation.isPending,
    refetchTrips,
    refetchProfile: profileQuery.refetch,
  };
});

export function useFilteredTrips(filter: TripType | 'all') {
  const { trips } = useApp();
  return useMemo(() => {
    if (filter === 'all') return trips;
    return trips.filter(t => t.type === filter);
  }, [trips, filter]);
}

export function useSearchTrips(query: string, type: TripType | 'all') {
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
    return filtered;
  }, [trips, query, type]);
}
