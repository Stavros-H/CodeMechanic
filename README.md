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
├── src/app/api/            # Authenticated profile and project APIs
├── src/db/schema.sql       # Replit PostgreSQL schema
├── src/lib/db.ts           # Server-only PostgreSQL connection
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## ⚙️ Tech Stack

- **Frontend**: React 18+, Next.js, Tailwind CSS, Phaser 3
- **State Management**: Zustand
- **Validation**: Zod
- **Authentication**: Replit-managed Clerk Auth
- **Database**: Replit-managed PostgreSQL
- **Deployment**: Replit

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9+
- npm or yarn
- Replit workspace with Clerk Auth and PostgreSQL enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Stavros-H/CodeMechanic.git
cd CodeMechanic
```

2. Install dependencies:
```bash
git checkout vibe/phase2-app-shell
npm install
```

3. Run the development server in Replit:
```bash
npm run dev
```

Open the Replit Preview to use the app shell, sign-in pages, and project
workspace.

> The editor and gameplay views are still being built. Sprite file storage
> and the complete project-saving workflow are not yet implemented.

## Authentication and Database

Clerk manages CodeMechanic accounts. Its sign-in and sign-up pages are
branded to match the dark purple theme. Replit PostgreSQL stores profiles,
projects, and likes; authenticated API routes enforce ownership checks.

The schema is in `src/db/schema.sql`. On Replit, development schema changes
are applied to the development database and promoted to production through
the Publish flow. Sprite file storage is a later feature; this database
schema stores project data, not uploaded image files.

## 📝 Validation Schemas

The Zod schemas in `src/schemas/projectSchemas.ts` provide:

- Type-safe project data structures
- Validation before API calls
- Server-side validation in API routes
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

- **Ownership checks**: API routes verify the signed-in Clerk user
- **Unique Constraints**: Prevent duplicate likes
- **Server-only database access**: PostgreSQL credentials are never exposed to the browser
- **Validation**: Zod schemas ensure data integrity

## 📞 License

MIT
