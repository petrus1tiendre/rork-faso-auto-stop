import { createTRPCRouter } from "./create-context";
import { tripsRouter } from "./routes/trips";
import { chatsRouter } from "./routes/chats";
import { profileRouter } from "./routes/profile";

export const appRouter = createTRPCRouter({
  trips: tripsRouter,
  chats: chatsRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
