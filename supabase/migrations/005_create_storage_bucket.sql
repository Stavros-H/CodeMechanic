-- Migration: Documentation for storage bucket setup
-- This is a documentation file - actual bucket creation must be done via Supabase Dashboard or API

-- Storage Bucket: sprites
-- Purpose: Store all user-uploaded sprite PNG images
-- Configuration:
--   - Bucket name: sprites
--   - Public access: Enabled (for serving images via CDN)
--   - File size limit: 500 KB per file
--   - File type restriction: PNG only (.png extension)
--   - Max files per user: Enforced via application logic (20MB total per user)

-- Note: In Supabase, buckets are created through the Storage API or Dashboard
-- This SQL file documents the required configuration

-- To create via SQL (if using a compatible Supabase version):
-- This would typically be done via the Supabase API or Dashboard UI

-- Expected bucket policy:
-- All authenticated users can upload to their own paths
-- Public read access for all files in the bucket
