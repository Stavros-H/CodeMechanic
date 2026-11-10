# CodeMechanic

> Zero-setup, multi-genre 2D game creation sandbox for desktop web browsers

## 🎮 About

CodeMechanic is a browser-based game development platform that allows users to:
- Design custom pixel-art sprites
- Define vector hitbox masks
- Configure physics and economy parameters via interactive UI
- Instantly playtest and share creations
- Remix existing projects

## 🏗️ Architecture

The system follows a strict decoupled layered architecture:

```
React 18 UI Overlay
    ↓ Emits Validated Events
Type-Safe Event Bus (Zustand + Zod)
    ↓ Consumes Runtime Changes
Phaser 3 Game Engine
```

## 📁 Project Structure

```
codemechanic/
├── src/
│   ├── schemas/           # Zod validation schemas
│   │   └── projectSchemas.ts
│   ├── types/             # TypeScript type definitions
│   └── ...
├── supabase/
│   ├── migrations/        # PostgreSQL migration scripts
│   │   ├── 001_create_profiles_table.sql
│   │   ├── 002_create_projects_table.sql
│   │   ├── 003_create_project_likes_table.sql
│   │   ├── 004_create_increment_play_count_function.sql
│   │   └── 005_create_storage_bucket.sql
│   └── functions/
│       └── delete-project-assets/  # Edge function for storage cleanup
│           └── index.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## ⚙️ Tech Stack

- **Frontend**: React 18+, Next.js, Tailwind CSS, Phaser 3
- **State Management**: Zustand
- **Validation**: Zod
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9+
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Stavros-H/CodeMechanic.git
cd CodeMechanic
```

2. Install dependencies:
```bash
git checkout vibe/phase1-db-auth
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the development server:
```bash
npm run dev
```

Open the Replit Preview (or [http://localhost:5000](http://localhost:5000)
when running locally) to view the Phase 1 foundations page.

> This branch contains the Phase 1 database, validation, and asset-cleanup
> foundations. It does not include the full game editor or other website
> screens, and the preview does not connect to a Supabase project by default.

## 📋 Phase 1: Database & Auth Foundations

This phase establishes the persistent cloud data layer, SQL tables, RLS security policies, and asset storage pipeline on Supabase.

### ✅ Deliverables Included

1. **PostgreSQL Migration Scripts** (`supabase/migrations/`)
   - `001_create_profiles_table.sql` - User profiles table with RLS
   - `002_create_projects_table.sql` - Projects table with RLS and triggers
   - `003_create_project_likes_table.sql` - Project likes join table with RLS
   - `004_create_increment_play_count_function.sql` - Atomic play count incrementer
   - `005_create_storage_bucket.sql` - Storage bucket configuration

2. **Edge Function** (`supabase/functions/delete-project-assets/`)
   - `index.ts` - Deletes associated PNG blobs before project deletion

3. **Validation Layer** (`src/schemas/projectSchemas.ts`)
   - `ProjectSchema` - Complete project data validation
   - `SpriteSchema` - Sprite definition validation
   - `MechanicsConfigSchema` - Physics and gameplay configuration
   - `EconomyConfigSchema` - Economy and upgrade scaling
   - `AudioConfigSchema` - Procedural audio configuration
   - `LevelDataSchema` - Level layout and wave spawners
   - `HitboxSchema` - Collision geometry definitions

### 🔧 Applying Migrations

To apply the SQL migrations to your Supabase database:

1. Use the Supabase Dashboard SQL editor
2. Execute each migration file in order:
   ```bash
   psql -h your-supabase-url -U postgres -d postgres -f supabase/migrations/001_create_profiles_table.sql
   psql -h your-supabase-url -U postgres -d postgres -f supabase/migrations/002_create_projects_table.sql
   # ... and so on
   ```

Or use the Supabase CLI:
```bash
supabase db push
```

### 📊 Database Schema Overview

#### Tables

- **`public.profiles`** - User profiles linked to Supabase Auth
- **`public.projects`** - Game projects with JSONB project_data
- **`public.project_likes`** - Like tracking with unique constraint

#### RLS Policies

- Public read access for published projects
- Authenticated users can read/write their own projects
- Like operations restricted to authenticated users

#### Storage

- **Bucket**: `sprites`
- **Max file size**: 500 KB per PNG
- **Public access**: Enabled for CDN serving

## 📝 Validation Schemas

The Zod schemas in `src/schemas/projectSchemas.ts` provide:

- Type-safe project data structures
- Client-side validation before API calls
- Server-side validation (when used in Edge Functions)
- Comprehensive type definitions for TypeScript

### Example Usage

```typescript
import { ProjectSchema, CreateProjectSchema } from '@/schemas/projectSchemas';

// Validate incoming project data
const parsedProject = ProjectSchema.parse(projectData);

// Validate project creation
const parsedCreate = CreateProjectSchema.parse(newProject);
```

## 🔒 Security Features

- **RLS Policies**: Row-level security on all tables
- **Unique Constraints**: Prevent duplicate likes
- **Storage Cleanup**: Edge function removes orphaned assets
- **Validation**: Zod schemas ensure data integrity
- **Rate Limiting**: Supabase provides built-in rate limiting

## 📞 License

MIT
