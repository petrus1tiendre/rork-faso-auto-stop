import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Trip, TripType, ChatConversation, UserProfile } from '@/types';
import { trpc, isBackendConfigured } from '@/lib/trpc';
import { mockTrips, mockChats, mockProfile } from '@/mocks/trips';

const FAVORITES_KEY = 'faso_autostop_favorites';


export const [AppProvider, useApp] = createContextHook(() => {
  const backendReady = isBackendConfigured();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(!backendReady);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [localTrips, setLocalTrips] = useState<Trip[]>(mockTrips);

  const tripsQuery = trpc.trips.list.useQuery(
    { type: 'all', query: '' },
    {
      enabled: backendReady,
      refetchOnWindowFocus: true,
      refetchInterval: 60000,
      retry: 1,
    }
  );

  const chatsQuery = trpc.chats.list.useQuery(undefined, {
    enabled: backendReady,
    refetchInterval: 30000,
    retry: 1,
  });

  const profileQuery = trpc.profile.get.useQuery(undefined, {
    enabled: backendReady,
    retry: 1,
  });

  const createTripMutation = trpc.trips.create.useMutation({
    onSuccess: () => {
      console.log('[AppProvider] Trip created on backend, refetching...');
      tripsQuery.refetch();
    },
    onError: (error) => {
      console.log('[AppProvider] Failed to create trip on backend:', error.message);
    },
  });

  const trips: Trip[] = useMemo(() => {
    if (backendReady && tripsQuery.data) {
      return tripsQuery.data.map((t) => ({
        id: t.id,
        type: t.type,
        departure: t.departure,
        arrival: t.arrival,
        date: t.date,
        time: t.time,
        seats: t.seats,
        seatsAvailable: t.seatsAvailable,
        price: t.price,
        driverName: t.driverName,
        driverAvatar: t.driverAvatar,
        driverRating: t.driverRating,
        driverTrips: t.driverTrips,
        verified: t.verified,
        comments: t.comments,
        createdAt: t.createdAt,
      }));
    }
    return localTrips;
  }, [tripsQuery.data, backendReady, localTrips]);

  const chats: ChatConversation[] = useMemo(() => {
    if (backendReady && chatsQuery.data) {
      return chatsQuery.data.map((c) => ({
        id: c.id,
        tripId: c.tripId,
        otherUser: c.otherUser,
        otherAvatar: c.otherAvatar,
        lastMessage: c.lastMessage,
        lastMessageTime: c.lastMessageTime,
        unread: c.unread,
        tripSummary: c.tripSummary,
      }));
    }
    return mockChats;
  }, [chatsQuery.data, backendReady]);

  const profile: UserProfile = useMemo(() => {
    if (backendReady && profileQuery.data) {
      return {
        id: profileQuery.data.id,
        name: profileQuery.data.name,
        phone: profileQuery.data.phone,
        avatar: profileQuery.data.avatar,
        rating: profileQuery.data.rating,
        tripsCompleted: profileQuery.data.tripsCompleted,
        verified: profileQuery.data.verified,
        memberSince: profileQuery.data.memberSince,
        bulletin3Uploaded: profileQuery.data.bulletin3Uploaded,
      };
    }
    return mockProfile;
  }, [profileQuery.data, backendReady]);

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

  const addTrip = useCallback((trip: Trip) => {
    if (backendReady) {
      console.log('[AppProvider] Creating trip on backend...');
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
    } else {
      console.log('[AppProvider] Backend not configured, saving trip locally');
      setLocalTrips(prev => [trip, ...prev]);
    }
  }, [createTripMutation, backendReady]);

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
    if (!backendReady) {
      console.log('[AppProvider] Backend not configured, skipping refetch');
      return;
    }
    setIsSyncing(true);
    tripsQuery.refetch().finally(() => setIsSyncing(false));
  }, [tripsQuery, backendReady]);

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
    isLoading: backendReady ? tripsQuery.isLoading : false,
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
