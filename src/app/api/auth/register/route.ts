import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimitDistributed } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
  userType: z.enum(["candidate", "recruiter"]).optional(),
  companyName: z.string().trim().min(1).max(100).optional(),
  companySize: z.string().trim().min(1).max(50).optional(),
  jobTitle: z.string().trim().min(1).max(100).optional(),
  otp: z.string().trim().optional(),
});

export async function POST(req: Request) {
  // 5 attempts per 5 min per IP — sign-up + OTP-guess abuse guard (production
  // only). Distributed so the cap holds across serverless instances.
  if (process.env.NODE_ENV === "production") {
    const rl = await rateLimitDistributed("register:" + clientKey(req), 5, 5 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many sign-ups from this address. Try again later." },
        {
          status: 429,
          headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) },
        }
      );
    }
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.flatten().fieldErrors.password?.[0] ??
            parsed.error.flatten().fieldErrors.email?.[0] ??
            "Invalid input.",
        },
        { status: 400 }
      );
    }

    const { name, email, password, userType, companyName, companySize, jobTitle, otp } = parsed.data;

    // Validate official email for recruiters
    if (userType === "recruiter") {
      const publicDomains = [
        "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", 
        "icloud.com", "aol.com", "protonmail.com", "proton.me", 
        "mail.com", "zoho.com"
      ];
      const domain = email.split("@")[1]?.toLowerCase();
      if (publicDomains.includes(domain)) {
        return NextResponse.json(
          { error: "Recruiters must sign up with an official company email address." },
          { status: 400 }
        );
      }
      if (!companyName || !companyName.trim()) {
        return NextResponse.json(
          { error: "Company name is required for recruiters." },
          { status: 400 }
        );
      }
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: "Display name is required for recruiters." },
          { status: 400 }
        );
      }
      if (!jobTitle || !jobTitle.trim()) {
        return NextResponse.json(
          { error: "Job title is required for recruiters." },
          { status: 400 }
        );
      }
      if (!companySize) {
        return NextResponse.json(
          { error: "Company size is required for recruiters." },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    if (existing?.passwordHash) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    // 1. Send OTP if not provided
    if (!otp) {
      // crypto-secure — Math.random() is predictable enough to matter for an
      // email-verification code.
      const generatedOtp = randomInt(100000, 1000000).toString();

      // Overwrite any existing tokens for this email
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });

      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token: generatedOtp,
          expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        },
      });

      const emailRes = await sendEmail({
        template: "otp-verification",
        to: email,
        props: { otp: generatedOtp },
      });

      if (!emailRes.sent) {
        return NextResponse.json(
          { error: `Failed to send verification email: ${emailRes.reason}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, otpSent: true });
    }

    // 2. Validate supplied OTP
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: otp,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Invalid verification code. Please check your email and try again." },
        { status: 400 }
      );
    }

    if (tokenRecord.expires < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // OTP is valid. Delete it and finalize registration.
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    const passwordHash = await bcrypt.hash(password, 12);

    if (existing) {
      // OAuth user adding a password to their existing account
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          ...(name ? { name } : {}),
          ...(userType ? { userType } : {}),
          ...(userType === "recruiter" ? {
            companyName,
            companySize,
            jobTitle,
          } : {}),
        } as any,
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          name: name ?? email.split("@")[0],
          passwordHash,
          userType: userType ?? "candidate",
          ...(userType === "recruiter" ? {
            companyName,
            companySize,
            jobTitle,
          } : {}),
        } as any,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[register API error]:", err);
    // Never echo internal error details (messages/stacks) to the client.
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
