import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

interface StoredTrip {
  id: string;
  type: "urbain" | "interville";
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

const seedTrips: StoredTrip[] = [
  {
    id: "1",
    type: "urbain",
    departure: "Ouaga 2000",
    arrival: "Tampouy",
    date: "2026-03-01",
    time: "07:30",
    seats: 4,
    seatsAvailable: 2,
    price: 500,
    driverName: "Abdoul K.",
    driverAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    driverRating: 4.8,
    driverTrips: 45,
    verified: true,
    comments: "Départ ponctuel, climatisation disponible",
    createdAt: "2026-02-28T10:00:00Z",
  },
  {
    id: "2",
    type: "interville",
    departure: "Ouagadougou",
    arrival: "Bobo-Dioulasso",
    date: "2026-03-02",
    time: "06:00",
    seats: 4,
    seatsAvailable: 3,
    price: 5000,
    driverName: "Fatima S.",
    driverAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face",
    driverRating: 4.9,
    driverTrips: 78,
    verified: true,
    comments: "Toyota Corolla 2020, bagages acceptés. Arrêt pause à Boromo.",
    createdAt: "2026-02-28T08:00:00Z",
  },
  {
    id: "3",
    type: "urbain",
    departure: "Koudougou (centre)",
    arrival: "Pissy",
    date: "2026-03-01",
    time: "08:00",
    seats: 3,
    seatsAvailable: 1,
    price: 400,
    driverName: "Ibrahim T.",
    driverAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    driverRating: 4.5,
    driverTrips: 22,
    verified: false,
    comments: "Trajet rapide par la voie principale",
    createdAt: "2026-02-28T12:00:00Z",
  },
  {
    id: "4",
    type: "interville",
    departure: "Bobo-Dioulasso",
    arrival: "Ouagadougou",
    date: "2026-03-03",
    time: "05:30",
    seats: 4,
    seatsAvailable: 4,
    price: 4500,
    driverName: "Moussa D.",
    driverAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    driverRating: 4.7,
    driverTrips: 56,
    verified: true,
    comments: "Peugeot 308, très confortable. Départ tôt le matin.",
    createdAt: "2026-02-27T18:00:00Z",
  },
  {
    id: "5",
    type: "urbain",
    departure: "Dassasgho",
    arrival: "Zone du Bois",
    date: "2026-03-01",
    time: "17:30",
    seats: 3,
    seatsAvailable: 2,
    price: 600,
    driverName: "Amina O.",
    driverAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    driverRating: 4.6,
    driverTrips: 33,
    verified: true,
    comments: "Retour du travail, trajet quotidien",
    createdAt: "2026-02-28T14:00:00Z",
  },
  {
    id: "6",
    type: "urbain",
    departure: "Patte d'Oie",
    arrival: "Université JKZ",
    date: "2026-03-01",
    time: "07:00",
    seats: 4,
    seatsAvailable: 3,
    price: 350,
    driverName: "Seydou B.",
    driverAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    driverRating: 4.3,
    driverTrips: 15,
    verified: false,
    comments: "Trajet universitaire quotidien",
    createdAt: "2026-02-28T16:00:00Z",
  },
];

let tripsStore: StoredTrip[] = [...seedTrips];

export const tripsRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        type: z.enum(["all", "urbain", "interville"]).optional().default("all"),
        query: z.string().optional().default(""),
      }).optional()
    )
    .query(({ input }) => {
      const filter = input ?? { type: "all", query: "" };
      let results = [...tripsStore];

      if (filter.type !== "all") {
        results = results.filter((t) => t.type === filter.type);
      }

      if (filter.query.trim()) {
        const lower = filter.query.toLowerCase();
        results = results.filter(
          (t) =>
            t.departure.toLowerCase().includes(lower) ||
            t.arrival.toLowerCase().includes(lower) ||
            t.driverName.toLowerCase().includes(lower)
        );
      }

      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log(`[Backend] trips.list: returning ${results.length} trips`);
      return results;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const trip = tripsStore.find((t) => t.id === input.id);
      console.log(`[Backend] trips.getById: ${input.id} -> ${trip ? "found" : "not found"}`);
      return trip ?? null;
    }),

  create: publicProcedure
    .input(
      z.object({
        type: z.enum(["urbain", "interville"]),
        departure: z.string().min(1),
        arrival: z.string().min(1),
        date: z.string().min(1),
        time: z.string().min(1),
        seats: z.number().min(1).max(8),
        price: z.number().min(0),
        comments: z.string().optional().default(""),
        driverName: z.string(),
        driverAvatar: z.string(),
        driverRating: z.number(),
        driverTrips: z.number(),
        verified: z.boolean(),
      })
    )
    .mutation(({ input }) => {
      const newTrip: StoredTrip = {
        id: Date.now().toString(),
        type: input.type,
        departure: input.departure,
        arrival: input.arrival,
        date: input.date,
        time: input.time,
        seats: input.seats,
        seatsAvailable: input.seats,
        price: input.price,
        driverName: input.driverName,
        driverAvatar: input.driverAvatar,
        driverRating: input.driverRating,
        driverTrips: input.driverTrips,
        verified: input.verified,
        comments: input.comments,
        createdAt: new Date().toISOString(),
      };

      tripsStore = [newTrip, ...tripsStore];
      console.log(`[Backend] trips.create: new trip ${newTrip.id}`);
      return newTrip;
    }),
});
