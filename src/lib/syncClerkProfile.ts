import { currentUser } from "@clerk/nextjs/server";
import { getDatabasePool } from "@/lib/db";

export async function syncClerkProfile(userId: string) {
  const user = await currentUser();
  if (!user || user.id !== userId) {
    throw new Error("Could not verify the signed-in account.");
  }

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const username = (
    user.username ||
    user.fullName ||
    email?.split("@")[0] ||
    userId
  ).slice(0, 50);
  const avatarUrl = user.imageUrl || null;

  const result = await getDatabasePool().query(
    `INSERT INTO profiles (id, username, email, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       username = EXCLUDED.username,
       email = EXCLUDED.email,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW()
     RETURNING id, username, email, avatar_url, created_at`,
    [userId, username, email, avatarUrl],
  );

  return result.rows[0];
}
