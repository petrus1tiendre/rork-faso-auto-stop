import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

interface StoredProfile {
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

let profileStore: StoredProfile = {
  id: "u1",
  name: "Ousmane Kaboré",
  phone: "+226 70 12 34 56",
  avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
  rating: 4.7,
  tripsCompleted: 23,
  verified: true,
  memberSince: "Janvier 2026",
  bulletin3Uploaded: true,
};

export const profileRouter = createTRPCRouter({
  get: publicProcedure.query(() => {
    console.log("[Backend] profile.get: returning profile");
    return profileStore;
  }),

  update: publicProcedure
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        avatar: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      if (input.name) profileStore.name = input.name;
      if (input.phone) profileStore.phone = input.phone;
      if (input.avatar) profileStore.avatar = input.avatar;
      console.log("[Backend] profile.update: profile updated");
      return profileStore;
    }),

  uploadBulletin: publicProcedure
    .input(z.object({ uploaded: z.boolean() }))
    .mutation(({ input }) => {
      profileStore.bulletin3Uploaded = input.uploaded;
      console.log(`[Backend] profile.uploadBulletin: ${input.uploaded}`);
      return { success: true };
    }),
});
