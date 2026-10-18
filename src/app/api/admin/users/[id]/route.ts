import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { hardDeleteUser, updateProfile, type Actor } from "@/app/admin/users/_lib/ops";

type Params = { params: Promise<{ id: string }> };

async function actorFor(permission: "user:manage"): Promise<Actor | null> {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, permission))) return null;
  return {
    id: session?.user?.id,
    email: session?.user?.email,
    isPlatformAdmin: await staffCan(session, "platform:admin"),
  };
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

/**
 * Profile fields only. Suspension, deletion and the other account actions are
 * server actions in src/app/admin/users/actions.ts (audited, with reasons).
 */
const patchSchema = z
  .object({
    name: optionalText(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254).optional(),
    bio: optionalText(2000),
    hireMeUrl: optionalText(500),
    portfolioPublic: z.boolean().optional(),
  })
  .strict();

export async function PATCH(req: Request, { params }: Params) {
  const actor = await actorFor("user:manage");
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".");
    const message =
      issue?.code === "unrecognized_keys"
        ? "Only name, email, bio, hireMeUrl and portfolioPublic can be changed here."
        : issue?.message ?? "Invalid input.";
    return NextResponse.json({ error: message, field }, { status: 400 });
  }

  try {
    const r = await updateProfile(actor, id, parsed.data);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status ?? 400 });
    return NextResponse.json({ ok: true, message: r.message });
  } catch (error) {
    console.error("[admin/users PATCH]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Permanent delete. Platform admins only, with the user's email (or id when
 * there is no email) typed as `confirm`. Refused for yourself, platform
 * admins and sole workspace owners. Prefer soft delete in the console.
 */
export async function DELETE(req: Request, { params }: Params) {
  const actor = await actorFor("user:manage");
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.isPlatformAdmin) {
    return NextResponse.json({ error: "Only a platform admin can permanently delete an account." }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { confirm?: unknown; note?: unknown } | null;
  const confirm = typeof body?.confirm === "string" ? body.confirm : new URL(req.url).searchParams.get("confirm") ?? "";
  const note = typeof body?.note === "string" ? body.note.slice(0, 1000) : undefined;
  try {
    const r = await hardDeleteUser(actor, id, confirm, note);
    if (!r.ok) {
      const status = r.error === "User not found." ? 404 : 400;
      return NextResponse.json({ error: r.error }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/users DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
