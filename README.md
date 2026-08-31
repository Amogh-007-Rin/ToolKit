# ToolKit

A modern, full-stack web toolkit built with [Next.js](https://nextjs.org), [Prisma](https://www.prisma.io), [Tailwind CSS](https://tailwindcss.com), and [Bun](https://bun.sh).

## ✨ Features

- **Next.js 16 (App Router)** — fast, file-based routing and server components
- **Authentication** — email/password sign in + optional OAuth (Google, GitHub, LinkedIn, Discord) via NextAuth
- **Dashboard** — protected app area with route-specific components
- **Database** — PostgreSQL with Prisma ORM (schema, migrations, and studio built in)
- **Modern UI** — Tailwind CSS v4, Framer Motion animations, Lucide icons, light/dark themes
- **Typed & validated** — TypeScript end-to-end with Zod schemas

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/docs/install) (v1.x or later)
- A running [PostgreSQL](https://www.postgresql.org) instance

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Amogh-007-Rin/Toolkit

# 2. Enter the web app
cd ./web

# 3. Create your environment file
cp .env.example .env
```

### 4. Configure environment variables

Edit `.env` and set at minimum:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Generate one with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL, e.g. `http://localhost:3000` |

OAuth provider IDs (`GOOGLE_CLIENT_ID`, `GITHUB_ID`, etc.) are optional — sign-in buttons for unconfigured providers will not work.

### 5. Install & run

```bash
# Install dependencies
bun install

# Set up the database
docker compose up -d 

# Run database migration
bunx prisma migrate dev

# Generate prisma client
bunx prisma generate

# Live view database changes
bunx prisma studio

# Run the development build
bun dev

# Run the production build
bun run build

# Start the server
bun start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

For a complete web, messaging, and mobile review environment, follow
[REVIEW.md](REVIEW.md). It includes database migration, local-network mobile
configuration, service health checks, and known external-service limitations.

## 🛠️ Development

```bash
bun dev                # Start the dev server with hot reload
bun run lint           # Run ESLint
bun run prisma:studio  # Open Prisma Studio to browse the database
```

## 📁 Project Structure

```
web/
├── public/                 # Static assets
└── src/
    ├── app/                # App Router: routes, layouts, pages, API handlers
    ├── components/         # Reusable UI, layout, and form components
    ├── hooks/              # Custom React hooks
    ├── lib/                # Client initializations (Prisma, etc.)
    ├── services/           # API wrappers / server actions
    ├── styles/             # Global CSS and Tailwind config
    ├── types/              # Shared TypeScript definitions
    └── utils/              # Helper functions
```

See [Project-information/project-structure.md](Project-information/project-structure.md) for full details.

## 🐳 Docker

A `docker-compose.yml` is included at the repo root — useful for spinning up PostgreSQL locally:

```bash
docker compose up -d
```

## 📄 License

Private project. All rights reserved.
