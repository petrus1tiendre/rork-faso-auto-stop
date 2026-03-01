import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { trpc } from '@/lib/trpc';
import { Trip, TripType, ChatConversation, UserProfile } from '@/types';

const FAVORITES_KEY = 'faso_autostop_favorites';

const defaultProfile: UserProfile = {
  id: 'u1',
  name: 'Ousmane Kaboré',
  phone: '+226 70 12 34 56',
  avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
  rating: 4.7,
  tripsCompleted: 23,
  verified: true,
  memberSince: 'Janvier 2026',
  bulletin3Uploaded: true,
};

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const tripsQuery = trpc.trips.list.useQuery(undefined, {
    staleTime: 30_000,
    retry: 2,
    meta: { offline: true },
  });

  const chatsQuery = trpc.chats.list.useQuery(undefined, {
    staleTime: 30_000,
    retry: 2,
  });

  const profileQuery = trpc.profile.get.useQuery(undefined, {
    staleTime: 60_000,
    retry: 2,
  });

  const createTripMutation = trpc.trips.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['trips', 'list']] });
      console.log('[AppProvider] Trip created on backend, invalidating cache');
    },
    onError: (error) => {
      console.log('[AppProvider] Trip creation failed:', error.message);
    },
  });

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored) as string[]);
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
      console.log('[AppProvider] Backend unreachable, switching to offline mode');
    } else if (tripsQuery.isSuccess) {
      if (isOffline) {
        setIsSyncing(true);
        setTimeout(() => {
          setIsSyncing(false);
          setIsOffline(false);
          console.log('[AppProvider] Back online, sync complete');
        }, 1500);
      }
    }
  }, [tripsQuery.isError, tripsQuery.isSuccess, isOffline]);

  const trips: Trip[] = useMemo(() => {
    return tripsQuery.data ?? [];
  }, [tripsQuery.data]);

  const chats: ChatConversation[] = useMemo(() => {
    return chatsQuery.data ?? [];
  }, [chatsQuery.data]);

  const profile: UserProfile = useMemo(() => {
    return profileQuery.data ?? defaultProfile;
  }, [profileQuery.data]);

  const addTrip = useCallback((trip: Trip) => {
    createTripMutation.mutate({
      type: trip.type,
      departure: trip.departure,
      arrival: trip.arrival,
      date: trip.date,
      time: trip.time,
      seats: trip.seats,
      price: trip.price,
      comments: trip.comments,
      driverName: trip.driverName,
      driverAvatar: trip.driverAvatar,
      driverRating: trip.driverRating,
      driverTrips: trip.driverTrips,
      verified: trip.verified,
    });
    console.log('[AppProvider] Trip submitted to backend');
  }, [createTripMutation]);

  const toggleFavorite = useCallback((tripId: string) => {
    const updated = favorites.includes(tripId)
      ? favorites.filter(id => id !== tripId)
      : [...favorites, tripId];
    setFavorites(updated);
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated)).catch((e) => {
      console.log('[AppProvider] Failed to save favorites:', e);
    });
    console.log('[AppProvider] Favorite toggled:', tripId);
  }, [favorites]);

  const isFavorite = useCallback((tripId: string) => {
    return favorites.includes(tripId);
  }, [favorites]);

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
