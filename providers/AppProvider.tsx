import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trip, TripType, ChatConversation, UserProfile } from '@/types';
import { supabase } from '@/lib/supabase';
import { mockTrips, mockChats, mockProfile } from '@/mocks/trips';

const FAVORITES_KEY = 'faso_autostop_favorites';

async function fetchTrips(): Promise<Trip[]> {
  console.log('[AppProvider] Fetching trips from Supabase...');
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      users:user_id (name, avatar_url, is_verified, rating)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('[AppProvider] Supabase trips error:', error.message);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log('[AppProvider] No trips from Supabase, using mock data');
    return mockTrips;
  }

  return data.map((t: any) => ({
    id: t.id,
    type: t.type as TripType,
    departure: t.departure,
    arrival: t.arrival,
    date: t.date,
    time: t.date ? t.date.split('T')[1]?.slice(0, 5) ?? '00:00' : '00:00',
    seats: t.seats,
    seatsAvailable: t.seats,
    price: t.price_fcfa,
    driverName: t.users?.name ?? 'Conducteur',
    driverAvatar: t.users?.avatar_url ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    driverRating: t.users?.rating ?? 4.5,
    driverTrips: 0,
    verified: t.users?.is_verified ?? false,
    comments: t.comment ?? '',
    createdAt: t.created_at,
  }));
}

async function fetchChats(): Promise<ChatConversation[]> {
  console.log('[AppProvider] Fetching chats from Supabase...');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('[AppProvider] No session, using mock chats');
    return mockChats;
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      trips:trip_id (departure, arrival, date),
      messages (content, created_at)
    `)
    .or(`passenger_id.eq.${session.user.id}`)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    console.log('[AppProvider] No chats from Supabase, using mock data');
    return mockChats;
  }

  return mockChats;
}

async function fetchProfile(): Promise<UserProfile> {
  console.log('[AppProvider] Fetching profile from Supabase...');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('[AppProvider] No session, using mock profile');
    return mockProfile;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !data) {
    console.log('[AppProvider] No profile from Supabase, using mock data');
    return mockProfile;
  }

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    avatar: data.avatar_url ?? mockProfile.avatar,
    rating: data.rating,
    tripsCompleted: 0,
    verified: data.is_verified,
    memberSince: new Date(data.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    bulletin3Uploaded: false,
  };
}

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [localTrips, setLocalTrips] = useState<Trip[]>(mockTrips);

  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
    staleTime: 30000,
    retry: 1,
  });

  const chatsQuery = useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
    staleTime: 30000,
    retry: 1,
  });

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 60000,
    retry: 1,
  });

  const createTripMutation = useMutation({
    mutationFn: async (trip: Trip) => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? 'anonymous';

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          type: trip.type,
          departure: trip.departure,
          arrival: trip.arrival,
          date: `${trip.date}T${trip.time}:00`,
          seats: trip.seats,
          price_fcfa: trip.price,
          comment: trip.comments || null,
        })
        .select()
        .single();

      if (error) {
        console.log('[AppProvider] Supabase insert trip error:', error.message);
        throw error;
      }
      console.log('[AppProvider] Trip created on Supabase:', data?.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (error) => {
      console.log('[AppProvider] Failed to create trip:', error.message);
    },
  });

  const trips: Trip[] = useMemo(() => {
    if (tripsQuery.data && tripsQuery.data.length > 0) {
      return tripsQuery.data;
    }
    return localTrips;
  }, [tripsQuery.data, localTrips]);

  const chats: ChatConversation[] = useMemo(() => {
    if (chatsQuery.data) {
      return chatsQuery.data;
    }
    return mockChats;
  }, [chatsQuery.data]);

  const profile: UserProfile = useMemo(() => {
    if (profileQuery.data) {
      return profileQuery.data;
    }
    return mockProfile;
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
      console.log('[AppProvider] Backend unreachable, offline mode');
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
        console.log('[AppProvider] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const addTrip = useCallback((trip: Trip) => {
    console.log('[AppProvider] Creating trip via Supabase...');
    createTripMutation.mutate(trip);
    setLocalTrips(prev => [trip, ...prev]);
  }, [createTripMutation]);

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

  const refetchTrips = useCallback(() => {
    setIsSyncing(true);
    tripsQuery.refetch().finally(() => setIsSyncing(false));
  }, [tripsQuery]);

  return {
    trips,
    chats,
    profile,
    isOffline,
    isSyncing,
    favorites,
    addTrip,
    toggleFavorite,
    isFavorite,
    setIsOffline,
    setIsSyncing,
    isLoading: tripsQuery.isLoading,
    isPublishing: createTripMutation.isPending,
    refetchTrips,
    refetchChats: chatsQuery.refetch,
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
        t.driverName.toLowerCase().includes(lower)
      );
    }
    return filtered;
  }, [trips, query, type]);
}
