# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowMojo is a Lean Six Sigma project management application built with Next.js 15, Supabase, and Vercel. It helps teams manage continuous improvement projects using the DMAIC (Define, Measure, Analyze, Improve, Control) methodology.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Database & Auth**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Hosting**: Vercel
- **Charts**: Recharts
- **Forms**: react-hook-form with Zod validation

## Development Commands

```bash
# Start development server (uses Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Supabase commands (requires Docker)
npx supabase start           # Start local Supabase instance
npx supabase db reset        # Reset local database and run migrations
npx supabase gen types typescript --local > lib/types/supabase.ts  # Generate TypeScript types from schema
npx supabase migration new <name>  # Create new migration
```

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Create a Supabase project at https://supabase.com
3. Add your Supabase URL and anon key to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Architecture & Code Structure

### Directory Structure

```
/app
  /(auth)              # Authentication pages (login, signup)
  /(dashboard)         # Protected dashboard pages
    /dashboard         # Main dashboard
    /projects          # Project management pages
    /tools             # Lean Six Sigma tools pages
  /auth/callback       # OAuth callback handler
/components
  /ui                  # shadcn/ui components
  /tools               # Custom LSS tool components (planned)
/lib
  /supabase           # Supabase client utilities
    client.ts         # Browser client
    server.ts         # Server client
    middleware.ts     # Auth middleware helper
  /types              # TypeScript type definitions
/supabase
  /migrations         # Database migrations
```

### Authentication Flow

- Uses Supabase Auth with email/password
- Middleware (`middleware.ts`) protects dashboard routes
- Server-side auth check redirects unauthenticated users to `/login`
- Auth pages are in `(auth)` route group
- Dashboard pages are in `(dashboard)` route group with shared layout

### Database Schema

Key tables (see `supabase/migrations/20250101000000_initial_schema.sql`):

- **profiles**: User profiles (extends auth.users)
- **projects**: Main project records with DMAIC phase tracking
- **project_members**: Team members for each project (many-to-many)
- **project_phases**: Phase-specific data (status, dates, notes)
- **tools**: Stores LSS tool data (SIPOC, Fishbone, VSM, etc.) as JSONB
- **metrics**: Project metrics (baseline, target, actual)
- **datasets**: Imported data for analysis

All tables have Row Level Security (RLS) enabled. Users can only access projects they own or are members of.

### Supabase Client Usage

**Client Components:**
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

**Server Components:**
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

**Server Actions:**
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

### DMAIC Phases

The application is organized around five Lean Six Sigma phases:
1. **Define**: Project charter, SIPOC, Voice of Customer
2. **Measure**: Data collection, process mapping, baseline metrics
3. **Analyze**: Fishbone diagrams, Pareto charts, statistical analysis
4. **Improve**: FMEA, solution testing, implementation
5. **Control**: Control charts, SOPs, sustainability tracking

### Lean Six Sigma Tools

Tools are stored in the `tools` table with `tool_type` and flexible JSONB `data` field:

- **SIPOC**: Suppliers, Inputs, Process, Outputs, Customers
- **Fishbone/Ishikawa**: Root cause analysis diagram
- **VSM**: Value Stream Mapping
- **Pareto**: 80/20 analysis charts
- **FMEA**: Failure Mode and Effects Analysis
- **Control Charts**: X-bar, R, p-charts

Each tool component should save/load from the `tools` table and be phase-specific.

## Code Conventions

- Use TypeScript for all files
- Server Components by default; add `'use client'` only when needed
- Use async/await with Supabase (not promises)
- Always handle Supabase errors properly
- Use Tailwind classes for styling (no CSS modules)
- Import shadcn/ui components from `@/components/ui`
- Use `@/` path alias for imports
- Database types are defined in `lib/types/database.types.ts`

## Deployment

The app is designed for Vercel deployment:

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables (Supabase URL and anon key)
4. Deploy

Supabase production migrations are applied via Supabase CLI or dashboard.

## Important Notes

- All authentication is handled by Supabase Auth
- Row Level Security ensures data isolation between users/projects
- The middleware handles session refresh automatically
- Tools data is stored as JSONB for flexibility
- Charts use Recharts library for consistency
