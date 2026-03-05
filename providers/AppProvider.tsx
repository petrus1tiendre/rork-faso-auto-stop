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
  console.log('[AppProvider] Fetching trips from Supabase...');
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*, profiles(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('[AppProvider] Supabase trips error:', error.message);
      return [];
    }

    console.log('[AppProvider] Fetched trips:', data?.length ?? 0);
    return (data ?? []) as Trip[];
  } catch (e) {
    console.log('[AppProvider] Trips fetch exception:', e);
    return [];
  }
}

async function fetchProfile(userId: string, userEmail?: string): Promise<Profile | null> {
  console.log('[AppProvider] Fetching profile for:', userId);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      console.log('[AppProvider] Profile not found, creating one...');
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
        console.log('[AppProvider] Profile upsert error:', upsertError.message);
        return null;
      }
      console.log('[AppProvider] Profile created via upsert');
      return newProfile as Profile;
    }

    if (error) {
      console.log('[AppProvider] Profile fetch error:', error.message);
      return null;
    }

    return data as Profile;
  } catch (e) {
    console.log('[AppProvider] Profile fetch exception:', e);
    return null;
  }
}

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>([]);
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
        queryClient.invalidateQueries({ queryKey: ['userTripsCount'] });
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
          console.log('[AppProvider] User trips count error:', error.message);
          return 0;
        }
        return count ?? 0;
      } catch (e) {
        console.log('[AppProvider] User trips count exception:', e);
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
        console.log('[AppProvider] Insert trip error:', error.message);
        throw error;
      }
      console.log('[AppProvider] Trip created:', data?.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['userTripsCount'] });
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

  const userTripsCount = userTripsCountQuery.data ?? 0;

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
    const channel = supabase
      .channel('trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        console.log('[AppProvider] Realtime trip change:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['userTripsCount'] });
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
