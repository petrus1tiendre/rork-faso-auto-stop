import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Trip, TripType, ChatConversation, UserProfile } from '@/types';
import { mockTrips, mockChats, mockProfile } from '@/mocks/trips';

const TRIPS_KEY = 'faso_autostop_trips';
const FAVORITES_KEY = 'faso_autostop_favorites';

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [chats] = useState<ChatConversation[]>(mockChats);
  const [profile] = useState<UserProfile>(mockProfile);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(TRIPS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Trip[];
        return [...parsed, ...mockTrips.filter(mt => !parsed.find(p => p.id === mt.id))];
      }
      return mockTrips;
    },
  });

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    },
  });

  useEffect(() => {
    if (tripsQuery.data) {
      setTrips(tripsQuery.data);
    }
  }, [tripsQuery.data]);

  useEffect(() => {
    if (favoritesQuery.data) {
      setFavorites(favoritesQuery.data);
    }
  }, [favoritesQuery.data]);

  const { mutate: saveTrips } = useMutation({
    mutationFn: async (updatedTrips: Trip[]) => {
      await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updatedTrips));
      return updatedTrips;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const { mutate: saveFavorites } = useMutation({
    mutationFn: async (updatedFavorites: string[]) => {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
      return updatedFavorites;
    },
  });

  const addTrip = useCallback((trip: Trip) => {
    const updated = [trip, ...trips];
    setTrips(updated);
    saveTrips(updated);
    console.log('[AppProvider] Trip added:', trip.id);
  }, [trips, saveTrips]);

  const toggleFavorite = useCallback((tripId: string) => {
    const updated = favorites.includes(tripId)
      ? favorites.filter(id => id !== tripId)
      : [...favorites, tripId];
    setFavorites(updated);
    saveFavorites(updated);
    console.log('[AppProvider] Favorite toggled:', tripId);
  }, [favorites, saveFavorites]);

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
