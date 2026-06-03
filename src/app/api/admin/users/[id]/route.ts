import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => ({}));

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent banning yourself
    if (session?.user?.id === id && json.banned === true) {
      return NextResponse.json({ error: "You cannot ban yourself." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: json.name,
        email: json.email,
        bio: json.bio,
        hireMeUrl: json.hireMeUrl,
        portfolioPublic: json.portfolioPublic,
        banned: json.banned,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (session?.user?.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Double check that we're not deleting an admin if that's a policy we want
    // For now, I'll allow deleting other users (including admins if they are in the list)
    // but the UI currently hides the delete button for admins.

    await prisma.user.delete({ where: { id } });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
