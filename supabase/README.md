# SparkChat Backend - Supabase Setup & Migrations

This folder contains the isolated backend schema and policy configurations for SparkChat.

## Folder Structure
- `migrations/20260622000000_init_schema.sql`: Contains the database tables, performance indexes, triggers, and Row-Level Security (RLS) policies.

---

## Deployment Options

### Option A: Manual Setup (Easiest)
1. Go to the [Supabase Dashboard](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**.
3. Paste the contents of `migrations/20260622000000_init_schema.sql` and run it.
4. Set up the public storage buckets (`avatars`, `media`, `files`, `stickers`) via the **Storage** dashboard.

---

### Option B: Local CLI & Auto Migrations (Recommended for developers)
You can use the official Supabase CLI to run migrations locally and push them to production.

#### 1. Install & Initialize Supabase CLI
```bash
# Install Supabase CLI globally
npm install -g supabase

# Initialize the project
supabase init
```

#### 2. Local Database Development
You can spin up a local dockerized Supabase instance to test database changes without affecting production:
```bash
# Start local Supabase container (requires Docker running)
supabase start
```
This runs the migrations inside `supabase/migrations/` automatically on startup.

#### 3. Deploy Migrations to Production
To push these database schemas and configurations directly to your production project:
```bash
# Link your local CLI to your cloud project (requires your DB password)
supabase link --project-ref your-supabase-project-id

# Push migrations to production
supabase db push
```
