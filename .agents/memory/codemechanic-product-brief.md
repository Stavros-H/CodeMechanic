---
name: CodeMechanic product brief
description: Product goals, architecture constraints, core views, data/auth rules, and delivery phases from the supplied system architecture and build roadmap.
---

# Source documents

The user supplied these documents as the product source of truth:
- `attached_assets/CodeMechanic_Master_System_Architecture_&_Functional_Specifica_1794335378113.pdf`
- `attached_assets/CodeMechanic_Technical_Build_&_Execution_Roadmap.md_1794335378113.pdf`

Use this summary to keep later implementation aligned with both documents. The user also requested a dark-screen visual theme with purple as a prominent accent.

**Why:** The user explicitly asked that these documents guide future changes and that the existing work be checked against them.

**How to apply:** Before implementing a new screen or changing architecture, check it against the five-view MVP, phased roadmap, and constraints below. Call out unresolved differences instead of silently changing the product or stack.

## Product goal

CodeMechanic is a zero-setup, browser-based 2D game-creation sandbox for game-development enthusiasts, retro arcade fans, indie designers, and student programmers. Creators compose pixel-art sprites, Arcade hitboxes, mechanics, enemy rules, levels, and economy through visual tools, then playtest, share, and remix games. The MVP is primarily a desktop keyboard-and-mouse experience; its workspace uses responsive desktop, tablet, and mobile layouts, but this is not a native mobile app.

The universal game-loop model is: player character(s) + enemies/hazards + a win/loss goal. The engine is data-driven: game behavior is described by validated JSON and interpreted by prebuilt systems. Never use `eval`, stringified JavaScript execution, or arbitrary user scripts.

## Required architecture

- **React UI:** owns navigation, auth forms, tools, sliders, and canvas-adjacent controls. UI code must not directly mutate Phaser internals.
- **Zustand event/state bus:** UI changes emit typed JSON payloads validated with Zod; the central store is the boundary between UI and engine.
- **Phaser 3:** consumes state/events and controls scenes, Arcade Physics bodies, and runtime animation.
- Use Phaser Arcade Physics, not Matter.js. Hitboxes are rectangles or circles with offsets and dimensions/radius; polygon hitboxes are out of scope.
- Support entity roles `player_1`, `player_2`, `enemy`, `hazard`, `pickup`, `goal`, and `tile`. Player 1 and Player 2 have independent physics, movement, input, and attack configuration.
- Scenes are separated into boot, playtest, and isolated studio-preview lifecycles. A missing/broken sprite asset must fall back to a generated magenta/black checkerboard texture rather than crashing or leaving an invisible entity.
- The game view must be torn down when leaving the playtest route; studio/play state should not leak across routes.

The roadmap names React Router and these routes: `/`, `/explore`, `/play/:id`, `/studio/art`, and `/studio/rules`. The imported repository already uses Next.js, so this is an unresolved implementation difference: preserve the existing stack unless the user approves a route/stack decision, and ensure all five destinations and behaviors exist before claiming Phase 2 complete.

## Five domain views

1. **Arcade Hub (`/`):** featured/trending community games, activity stats, and quick-start genre templates.
2. **Genre & Template Directory (`/explore`):** searchable/filterable games and templates; sort by plays, likes, or date; show genre, author, tags, thumbnails, and remix/play actions.
3. **Playtest Arena (`/play/:id`):** full-screen Phaser canvas, keyboard focus trapping, FPS/entity-count/hitbox debug overlays, and community likes. Win/loss pauses physics and opens actions for replay, studio editing, or hub.
4. **Pixel & Hitbox Studio (`/studio/art`):** Sprite Backpack, pixel drawing, dual art/hitbox layers, animation frames, palette selection, resolution validation, and Arcade hitbox editing.
5. **Mechanics & Rule Configurator (`/studio/rules`):** physics and weapon tuning, composable enemy AI, win/loss conditions, economy, tile-grid level building, and wave spawners.

Login, signup, and account settings are separate from the five domain views.

## Creation and gameplay constraints

- Sprite frame states are `idle`, `run`, `jump`, and `action`; absent optional states fall back to idle. Sprite resolutions are locked at creation to 16×16, 32×32, or 64×64. Mismatched uploads must offer Auto-Crop, Downscale, or Cancel.
- Pixel Studio includes RGBA picking and PICO-8, Game Boy, NES, and Cyber Neon palettes. The art and hitbox layers stay transform-aligned: green for solid terrain, blue for hurtboxes, red for active hitboxes.
- Enemy AI is composable from movement profile + target rule + attack style. Levels combine a tile painter with spawn points, hazards, goals, wave timing/counts, and paths.
- Sound effects are synthesized at runtime with Web Audio from declarative wave/frequency/decay/duration settings; do not require uploaded audio binaries.
- Default local two-player controls use separated key groups: Player 1 WASD/arrows plus F/G and Space; Player 2 I/J/K/L plus U/O. Suppress browser shortcuts only while the game canvas has focus.
- Guest creators may edit/playtest in local memory. Signup/login must preserve the draft and save it to the user's account after auth; guests should not hit read-only editing blocks.
- Remix is a local clone with a new client UUID and `remixed_from_id`; clicking Remix must not write to the database. Persist only after explicit Save. Track `isDirty` and guard navigation with Save & Continue, Discard Changes, or Cancel.

## Data, permissions, and operational limits

- Supabase provides PostgreSQL, Auth, Storage, and Edge Functions. Core records are profiles, projects, and project likes; projects hold `project_data` JSONB, including sprites, levels, mechanics, economy, and audio configuration.
- Anyone may browse/play published projects. Only authenticated owners may create/update/delete their projects. Likes require authentication and must prevent duplicate user/project pairs.
- Apply the project-data payload ceiling of 2 MB, sprite PNG limit of 500 KB, account storage quota of 20 MB, and save rate limit of 60 requests/minute per auth token.
- On project deletion, remove its sprite blobs through `delete-project-assets` before deleting the database row; relational cascades then clear likes. Do not claim the Edge Function, migrations, bucket, or auth are deployed merely because source files exist.
- The database play counter should use an atomic increment function.
- Show non-blocking performance warnings above 150 active entities, over 64×64 tiles, or 15 MB uncompressed asset memory.

## Official seed blueprints

The roadmap calls for eight mechanic-driven seeds: Cyberpunk Platformer; Neon Vector Space Shooter; Roguelike Dungeon Crawler; 8-Bit Street Fighter Sandbox (local 2-player); Core Defense Citadel; Incremental Energy Lab; Stealth Extraction Room; and Boss Rush Arena. Preserve their distinguishing mechanics and win conditions from the source specification when implementing seed data.

## Ordered delivery phases

Implement phases in order and use their acceptance criteria rather than treating a landing page as completion:

1. **Database/auth foundations:** tables, RLS, storage bucket, cleanup Edge Function, and Zod schemas.
2. **App shell and routes:** all five views mounted, navbar, Zustand store, dirty-state guard, guest/auth flow, and write-on-save remix.
3. **Phaser integration:** React canvas lifecycle, boot fallback, Arcade adapters, hitboxes, and procedural audio.
4. **Pixel & Hitbox Studio:** Sprite Backpack, drawing tools, overlays, palettes, animation, resolution lock, and auto bounds.
5. **Mechanics & Rule Configurator:** physics, weapons, win/loss, AI rules, economy, tile painter, and wave controls.
6. **Hub, Directory, and seeds:** community browsing/filtering, playtest polish, and all eight playable/remixable blueprints.
7. **Safety and launch:** performance warnings, keyboard rollover validation, end-to-end QA, and production deployment.

