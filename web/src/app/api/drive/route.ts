import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listAppDataFiles } from "@/lib/drive-store";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || session.error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const listing = await listAppDataFiles(session.accessToken);
    return NextResponse.json(listing);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list Drive files" },
      { status: 502 }
    );
  }
}
