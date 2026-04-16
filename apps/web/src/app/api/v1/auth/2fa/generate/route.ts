import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Generate secret
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(session.user.email!, "IPE-24 Classroom CMS", secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    // Save secret temporarily but don't configure it as fully enabled until verified
    await prisma.user.update({
      where: { id: session.user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });

    return NextResponse.json({ secret, qrCodeDataUrl }, { status: 200 });
  } catch (error: any) {
    console.error("2FA generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
