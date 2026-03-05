export type TripType = 'urbain' | 'interville';

export interface Profile {
  id: string;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  rating: number;
  total_trips: number;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  type: TripType;
  departure: string;
  arrival: string;
  trip_date: string;
  trip_time: string;
  seats: number;
  price_fcfa: number;
  comment: string | null;
  status: string;
  created_at: string;
  profiles?: Profile | null;
}

export interface Booking {
  id: string;
  trip_id: string;
  passenger_id: string;
  status: string;
  created_at: string;
  trips?: Trip | null;
  profiles?: Profile | null;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  tripId: string;
  otherUser: string;
  otherAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  tripSummary: string;
}
