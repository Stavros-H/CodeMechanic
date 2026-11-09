-- Migration: Create profiles table
-- Up: Create the table

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant read access to all users
CREATE POLICY "Allow public read access to profiles"
ON public.profiles FOR SELECT
USING (true);

-- Grant insert/update to authenticated users for their own profile
CREATE POLICY "Allow users to insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Grant delete to authenticated users for their own profile
CREATE POLICY "Allow users to delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = id);
