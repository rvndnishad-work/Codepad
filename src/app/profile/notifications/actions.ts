"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FORCED_ON } from "@/lib/notifications/preferences";

export type UpdatePrefInput = {
  type: string;
  channel: "inApp" | "email";
  enabled: boolean;
};

export async function updatePreferenceAction(input: UpdatePrefInput) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Forced-on types cannot be toggled off — block here even though the UI
  // disables the toggle, so a direct API call can't bypass.
  if (FORCED_ON.has(input.type) && !input.enabled) {
    throw new Error("This notification type is required and can't be disabled.");
  }

  await prisma.notificationPreference.upsert({
    where: { userId_type: { userId: session.user.id, type: input.type } },
    create: {
      userId: session.user.id,
      type: input.type,
      inAppEnabled: input.channel === "inApp" ? input.enabled : true,
      emailEnabled: input.channel === "email" ? input.enabled : true,
    },
    update:
      input.channel === "inApp"
        ? { inAppEnabled: input.enabled }
        : { emailEnabled: input.enabled },
  });

  revalidatePath("/profile/notifications");
  return { ok: true };
}
