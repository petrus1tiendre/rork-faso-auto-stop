export type TripType = 'urbain' | 'interville';

export interface Trip {
  id: string;
  type: TripType;
  departure: string;
  arrival: string;
  date: string;
  time: string;
  seats: number;
  seatsAvailable: number;
  price: number;
  driverName: string;
  driverAvatar: string;
  driverRating: number;
  driverTrips: number;
  verified: boolean;
  comments: string;
  createdAt: string;
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

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isPaymentLink?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  rating: number;
  tripsCompleted: number;
  verified: boolean;
  memberSince: string;
  bulletin3Uploaded: boolean;
}
