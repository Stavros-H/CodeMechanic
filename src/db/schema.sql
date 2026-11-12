CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL CHECK (
    genre IN (
      'Platformer', 'Shooter', 'DungeonCrawler', 'Brawler',
      'TowerDefense', 'Idle', 'Stealth', 'BossRush'
    )
  ),
  owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  remixed_from_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  play_count INTEGER NOT NULL DEFAULT 0 CHECK (play_count >= 0),
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  thumbnail_url TEXT,
  project_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects(owner_id);
CREATE INDEX IF NOT EXISTS projects_public_updated_idx
  ON projects(is_published, updated_at DESC);
CREATE INDEX IF NOT EXISTS projects_genre_idx ON projects(genre);

CREATE TABLE IF NOT EXISTS project_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS project_likes_project_id_idx ON project_likes(project_id);

CREATE OR REPLACE FUNCTION increment_project_play_count(target_project_id UUID)
RETURNS VOID
LANGUAGE SQL
AS $$
  UPDATE projects
  SET play_count = play_count + 1, updated_at = NOW()
  WHERE id = target_project_id;
$$;
