import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Trip, TripType, ChatConversation, UserProfile } from '@/types';
import { mockTrips, mockChats, mockProfile } from '@/mocks/trips';

const FAVORITES_KEY = 'faso_autostop_favorites';
const TRIPS_KEY = 'faso_autostop_trips';

export const [AppProvider, useApp] = createContextHook(() => {
  const [trips, setTrips] = useState<Trip[]>(mockTrips);
  const [chats] = useState<ChatConversation[]>(mockChats);
  const [profile] = useState<UserProfile>(mockProfile);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedFavs, storedTrips] = await Promise.all([
          AsyncStorage.getItem(FAVORITES_KEY),
          AsyncStorage.getItem(TRIPS_KEY),
        ]);
        if (storedFavs) {
          setFavorites(JSON.parse(storedFavs) as string[]);
        }
        if (storedTrips) {
          const parsed = JSON.parse(storedTrips) as Trip[];
          const mergedIds = new Set(mockTrips.map(t => t.id));
          const userTrips = parsed.filter(t => !mergedIds.has(t.id));
          setTrips([...mockTrips, ...userTrips]);
        }
      } catch (e) {
        console.log('[AppProvider] Failed to load stored data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addTrip = useCallback((trip: Trip) => {
    setIsPublishing(true);
    setTrips(prev => {
      const updated = [trip, ...prev];
      AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updated)).catch(e => {
        console.log('[AppProvider] Failed to save trips:', e);
      });
      return updated;
    });
    setTimeout(() => setIsPublishing(false), 300);
    console.log('[AppProvider] Trip added locally');
  }, []);

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
    console.log('[AppProvider] Favorite toggled:', tripId);
  }, []);

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
    isLoading,
    isPublishing,
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
