import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

interface StoredChat {
  id: string;
  tripId: string;
  otherUser: string;
  otherAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  tripSummary: string;
}

interface StoredMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isPaymentLink?: boolean;
}

const chatsStore: StoredChat[] = [
  {
    id: "c1",
    tripId: "2",
    otherUser: "Fatima S.",
    otherAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face",
    lastMessage: "D'accord, je vous attends à la gare routière à 6h.",
    lastMessageTime: "14:32",
    unread: 2,
    tripSummary: "Ouaga \u2192 Bobo \u00b7 2 mars",
  },
  {
    id: "c2",
    tripId: "1",
    otherUser: "Abdoul K.",
    otherAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Le paiement Orange Money a été envoyé",
    lastMessageTime: "10:15",
    unread: 0,
    tripSummary: "Ouaga 2000 \u2192 Tampouy \u00b7 1 mars",
  },
  {
    id: "c3",
    tripId: "5",
    otherUser: "Amina O.",
    otherAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Merci pour le trajet ! \u00c0 demain",
    lastMessageTime: "Hier",
    unread: 0,
    tripSummary: "Dassasgho \u2192 Zone du Bois \u00b7 28 f\u00e9v",
  },
];

const messagesStore: StoredMessage[] = [
  {
    id: "m1",
    chatId: "c1",
    senderId: "u1",
    text: "Bonjour Fatima, il reste des places pour Bobo le 2 mars ?",
    timestamp: "2026-02-28T14:00:00Z",
  },
  {
    id: "m2",
    chatId: "c1",
    senderId: "u2",
    text: "Oui, il reste 3 places. Vous \u00eates combien ?",
    timestamp: "2026-02-28T14:15:00Z",
  },
  {
    id: "m3",
    chatId: "c1",
    senderId: "u1",
    text: "Juste moi. Je serai \u00e0 la gare routi\u00e8re vers 5h45.",
    timestamp: "2026-02-28T14:25:00Z",
  },
  {
    id: "m4",
    chatId: "c1",
    senderId: "u2",
    text: "D'accord, je vous attends \u00e0 la gare routi\u00e8re \u00e0 6h.",
    timestamp: "2026-02-28T14:32:00Z",
  },
  {
    id: "m5",
    chatId: "c2",
    senderId: "u3",
    text: "Bonjour, trajet confirm\u00e9 pour demain matin ?",
    timestamp: "2026-02-28T10:00:00Z",
  },
  {
    id: "m6",
    chatId: "c2",
    senderId: "u1",
    text: "Le paiement Orange Money a \u00e9t\u00e9 envoy\u00e9",
    timestamp: "2026-02-28T10:15:00Z",
    isPaymentLink: true,
  },
];

export const chatsRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    console.log(`[Backend] chats.list: returning ${chatsStore.length} chats`);
    return chatsStore;
  }),

  messages: publicProcedure
    .input(z.object({ chatId: z.string() }))
    .query(({ input }) => {
      const msgs = messagesStore.filter((m) => m.chatId === input.chatId);
      console.log(`[Backend] chats.messages: ${input.chatId} -> ${msgs.length} messages`);
      return msgs;
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        chatId: z.string(),
        senderId: z.string(),
        text: z.string().min(1),
        isPaymentLink: z.boolean().optional().default(false),
      })
    )
    .mutation(({ input }) => {
      const newMessage: StoredMessage = {
        id: `m${Date.now()}`,
        chatId: input.chatId,
        senderId: input.senderId,
        text: input.text,
        timestamp: new Date().toISOString(),
        isPaymentLink: input.isPaymentLink,
      };

      messagesStore.push(newMessage);

      const chat = chatsStore.find((c) => c.id === input.chatId);
      if (chat) {
        chat.lastMessage = input.text;
        chat.lastMessageTime = new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      console.log(`[Backend] chats.sendMessage: ${newMessage.id} in ${input.chatId}`);
      return newMessage;
    }),
});
