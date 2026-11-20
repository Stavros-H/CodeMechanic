import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDatabasePool } from "@/lib/db";

export const runtime = "nodejs";

const projectFields = `
  id, title, description, genre, owner_id AS author_id,
  is_published, is_template, remixed_from_id, play_count,
  like_count, thumbnail_url, project_data, created_at, updated_at
`;

// GET /api/projects/[id] — fetch one project to run in the playtest arena.
// Visible to its owner, and to everyone when published.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let userId: string | null = null;
  try {
    const authState = await auth();
    userId = authState.userId ?? null;
  } catch {
    userId = null;
  }

  try {
    const result = await getDatabasePool().query(
      `SELECT ${projectFields}
       FROM projects
       WHERE id = $1::uuid
         AND (is_published OR owner_id = $2::text)`,
      [id, userId],
    );

    if (!result.rowCount || !result.rows[0]) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ project: result.rows[0] });
  } catch (error) {
    console.error("Unable to load project.", error);
    return NextResponse.json(
      { error: "The project could not be loaded." },
      { status: 500 },
    );
  }
}
