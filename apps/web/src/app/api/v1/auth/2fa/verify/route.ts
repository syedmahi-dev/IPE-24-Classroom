export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { authenticator } from "otplib";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Rate limit: 5 attempts per minute per user
    const rl = await rateLimit(`2fa:${session.user.id}`, 5, 60);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorSecret: true }
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA secret not found" }, { status: 400 });
    }

    const isValid = authenticator.check(token, user.twoFactorSecret);

    if (isValid) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { twoFactorEnabled: true },
      });
      return NextResponse.json({ message: "2FA verified and enabled" }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("2FA verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
