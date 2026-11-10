-- Migration: Create increment_play_count function
-- Up: Create the atomic function

CREATE OR REPLACE FUNCTION increment_play_count(target_project_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.projects
    SET play_count = play_count + 1,
        updated_at = NOW()
    WHERE id = target_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_play_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_play_count(UUID) TO anon;
