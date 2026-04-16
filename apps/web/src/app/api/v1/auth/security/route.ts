import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, twoFactorEnabled: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasPassword: !!user.passwordHash,
      twoFactorEnabled: user.twoFactorEnabled
    }, { status: 200 });

  } catch (error: any) {
    console.error("Security info error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
