import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { syncClerkProfile } from "@/lib/syncClerkProfile";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const profile = await syncClerkProfile(userId);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Unable to sync the signed-in profile.", error);
    return NextResponse.json(
      { error: "Your account could not be saved to the database." },
      { status: 500 },
    );
  }
}
