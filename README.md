# BookMe

A modern, production-ready scheduling and client CRM system for service businesses.

## Features

- 📅 **Calendar Management** - Week/Day/Month views with drag & drop scheduling
- 👥 **Client CRM** - Comprehensive client profiles with history and preferences
- 💎 **Loyalty Points** - Configurable points system with transaction ledger
- ⚠️ **Strike System** - Track late cancellations and no-shows with configurable policies
- 🎂 **Birthday Tracking** - Never miss a client's special day
- 📊 **Reports & Analytics** - Revenue tracking, client insights, and CSV exports
- 🎨 **Modern UI** - Premium SaaS dashboard design with shadcn/ui components

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix)
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma 7
- **Authentication:** Auth.js (Credentials)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or Neon account)
- npm or yarn

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Update `.env` with your database URL and NextAuth secret:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"
```

3. **Set up the database:**

```bash
# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

4. **Run the development server:**

```bash
npm run dev
```

5. **Open your browser:**

Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login

- **Email:** admin@bookme.com
- **Password:** admin123

⚠️ **Change this password in production!**

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth routes
│   ├── app/               # Protected app routes
│   │   ├── calendar/      # Calendar view (main)
│   │   ├── clients/       # Client CRM
│   │   ├── services/      # Service catalog
│   │   ├── loyalty/       # Loyalty system
│   │   ├── policies/      # Strike policies
│   │   ├── reports/       # Analytics & reports
│   │   └── settings/      # App settings
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components
├── lib/                  # Utilities & configs
│   ├── auth.ts          # Auth.js configuration
│   ├── db.ts            # Prisma client
│   └── utils.ts         # Helper functions
├── prisma/              # Prisma schema & migrations
└── public/              # Static assets
```

## Database Schema

Key models:
- **User** - Admin/staff accounts
- **Client** - Customer profiles
- **Service** - Service catalog
- **Appointment** - Booking records
- **LoyaltyAccount** - Points balances
- **LoyaltyTransaction** - Points ledger
- **StrikeEvent** - Strike tracking
- **Settings** - App configuration

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push schema changes
- `npm run db:migrate` - Create migration
- `npm run db:seed` - Seed sample data
- `npm run db:studio` - Open Prisma Studio

### Adding New Features

1. Update Prisma schema if needed
2. Run `npm run db:push` or create migration
3. Create server actions in `app/actions/`
4. Build UI components
5. Add routes in `app/app/`

## Production Deployment

1. Set up PostgreSQL database (Neon, Supabase, etc.)
2. Set environment variables in your hosting platform
3. Run migrations: `npm run db:migrate`
4. Seed initial data: `npm run db:seed`
5. Build: `npm run build`
6. Deploy to Vercel, Railway, or your preferred platform

## License

Private - All rights reserved
