-- Migration: Create project_likes table
-- Up: Create the table

CREATE TABLE IF NOT EXISTS public.project_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_project_like UNIQUE (user_id, project_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_project_likes_user_id ON public.project_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_likes_project_id ON public.project_likes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_likes_created_at ON public.project_likes(created_at);

-- Enable Row Level Security
ALTER TABLE public.project_likes ENABLE ROW LEVEL SECURITY;

-- Users can view likes on public projects
CREATE POLICY "Allow read access to likes on published projects"
ON public.project_likes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects 
        WHERE public.projects.id = public.project_likes.project_id 
        AND public.projects.is_published = true
    )
);

-- Authenticated users can view their own likes
CREATE POLICY "Allow users to read their own likes"
ON public.project_likes FOR SELECT
USING (user_id = auth.uid());

-- Only authenticated users can add/remove their own likes
CREATE POLICY "Allow users to insert their own likes"
ON public.project_likes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to delete their own likes"
ON public.project_likes FOR DELETE
USING (user_id = auth.uid());
