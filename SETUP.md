# BookMe Setup Guide

## Quick Setup for Login to Work

### Option 1: Use Neon (Free PostgreSQL - Recommended)

1. **Sign up for Neon** (free): https://neon.tech
2. **Create a new project**
3. **Copy your connection string** (looks like: `postgresql://user:password@host/dbname?sslmode=require`)
4. **Update `.env` file:**
   ```env
   DATABASE_URL="your-neon-connection-string-here"
   NEXTAUTH_URL="http://localhost:3009"
   NEXTAUTH_SECRET="bookme-secret-key-change-in-production"
   ```
5. **Push schema to database:**
   ```bash
   npm run db:push
   ```
6. **Seed the database (creates admin user):**
   ```bash
   npm run db:seed
   ```
7. **Restart your dev server:**
   ```bash
   npm run dev
   ```

### Option 2: Use Supabase (Free PostgreSQL)

1. **Sign up for Supabase**: https://supabase.com
2. **Create a new project**
3. **Go to Settings > Database**
4. **Copy the connection string** (use the "URI" format)
5. **Update `.env` file** with the connection string
6. **Run `npm run db:push`** and **`npm run db:seed`**

### Option 3: Local PostgreSQL

1. **Install PostgreSQL** on your machine
2. **Create a database:**
   ```sql
   CREATE DATABASE bookme;
   ```
3. **Update `.env` file:**
   ```env
   DATABASE_URL="postgresql://your-username:your-password@localhost:5432/bookme?schema=public"
   ```
4. **Run `npm run db:push`** and **`npm run db:seed`**

## Default Login Credentials

After seeding the database:
- **Email:** `admin@bookme.com`
- **Password:** `admin123`

## Verify Database Connection

Run this command to check if your database is connected:
```bash
npm run db:check
```

## Troubleshooting

### "Authentication failed" error
- Your DATABASE_URL credentials are incorrect
- Double-check username, password, and host in your connection string

### "Database does not exist" error
- Create the database first (for local PostgreSQL)
- Or check your Neon/Supabase project settings

### "Table does not exist" error
- Run `npm run db:push` to create the tables

### "User not found" error
- Run `npm run db:seed` to create the admin user

### "ChunkLoadError: Loading chunk app/layout failed (timeout)"
- The dev server now uses **Turbopack** (`npm run dev`) to avoid this. Restart with `npm run dev`.
- If you see 404s or other issues, use the fallback: `npm run dev:webpack`.
- If the project is in **OneDrive**, exclude the `.next` folder from sync (right‑click `.next` → Free up space / Always keep on this device, or move the project out of OneDrive) so sync doesn’t lock files.

## Need Help?

1. Check your `.env` file has a valid DATABASE_URL
2. Run `npm run db:check` to test connection
3. Make sure you've run `npm run db:push` and `npm run db:seed`
