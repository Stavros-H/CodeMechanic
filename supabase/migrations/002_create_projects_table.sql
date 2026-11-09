-- Migration: Create projects table
-- Up: Create the table

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    genre TEXT NOT NULL CHECK (genre IN ('Platformer', 'Shooter',
    'DungeonCrawler', 'Brawler', 'TowerDefense', 'Idle', 'Stealth', 'BossRush')),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT false NOT NULL,
    is_template BOOLEAN DEFAULT false NOT NULL,
    remixed_from_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    play_count INTEGER DEFAULT 0 NOT NULL,
    like_count INTEGER DEFAULT 0 NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    project_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on author_id for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_author_id ON public.projects(author_id);
CREATE INDEX IF NOT EXISTS idx_projects_genre ON public.projects(genre);
CREATE INDEX IF NOT EXISTS idx_projects_is_published ON public.projects(is_published);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Public read access for published projects
CREATE POLICY "Allow public read access to published projects"
ON public.projects FOR SELECT
USING (is_published = true);

-- Authenticated users can read their own projects (including unpublished)
CREATE POLICY "Allow authenticated users to read their own projects"
ON public.projects FOR SELECT
USING (author_id = auth.uid() OR is_published = true);

-- Only project author can insert
CREATE POLICY "Allow project creation"
ON public.projects FOR INSERT
WITH CHECK (author_id = auth.uid());

-- Only project author can update
CREATE POLICY "Allow project updates by author"
ON public.projects FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Only project author can delete
CREATE POLICY "Allow project deletion by author"
ON public.projects FOR DELETE
USING (author_id = auth.uid());

-- Create trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
