import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Genre, ProjectDataSchema } from "@/schemas/projectSchemas";
import { getDatabasePool } from "@/lib/db";
import { syncClerkProfile } from "@/lib/syncClerkProfile";

export const runtime = "nodejs";

const SaveProjectSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(100),
  description: z.string().max(500).default(""),
  genre: Genre,
  is_published: z.boolean().default(false),
  is_template: z.boolean().default(false),
  remixed_from_id: z.string().uuid().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  project_data: ProjectDataSchema,
});

const projectFields = `
  id, title, description, genre, owner_id AS author_id,
  is_published, is_template, remixed_from_id, play_count,
  like_count, thumbnail_url, project_data, created_at, updated_at
`;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    await syncClerkProfile(userId);
    const result = await getDatabasePool().query(
      `SELECT ${projectFields}
       FROM projects
       WHERE owner_id = $1
       ORDER BY updated_at DESC`,
      [userId],
    );
    return NextResponse.json({ projects: result.rows });
  } catch (error) {
    console.error("Unable to load projects.", error);
    return NextResponse.json(
      { error: "Your projects could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  const requestBody = await request.text();
  if (Buffer.byteLength(requestBody, "utf8") > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Project data exceeds the 2 MB limit." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(requestBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = SaveProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Project data is invalid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await syncClerkProfile(userId);
    const project = parsed.data;
    const result = await getDatabasePool().query(
      `INSERT INTO projects (
         id, title, description, genre, owner_id, is_published, is_template,
         remixed_from_id, thumbnail_url, project_data
       )
       VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
       )
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         genre = EXCLUDED.genre,
         is_published = EXCLUDED.is_published,
         is_template = EXCLUDED.is_template,
         remixed_from_id = EXCLUDED.remixed_from_id,
         thumbnail_url = EXCLUDED.thumbnail_url,
         project_data = EXCLUDED.project_data,
         updated_at = NOW()
       WHERE projects.owner_id = EXCLUDED.owner_id
       RETURNING ${projectFields}`,
      [
        project.id ?? null,
        project.title,
        project.description,
        project.genre,
        userId,
        project.is_published,
        project.is_template,
        project.remixed_from_id ?? null,
        project.thumbnail_url ?? null,
        JSON.stringify(project.project_data),
      ],
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { error: "That project does not exist or is not yours to edit." },
        { status: 404 },
      );
    }

    return NextResponse.json({ project: result.rows[0] });
  } catch (error) {
    console.error("Unable to save project.", error);
    return NextResponse.json(
      { error: "Your project could not be saved." },
      { status: 500 },
    );
  }
}
