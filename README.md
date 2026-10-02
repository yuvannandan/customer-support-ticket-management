# Customer Support Ticket Management System

A full-stack customer support platform built with Next.js 16, TypeScript, Prisma, and SQLite. The system provides role-based workflows for customers, agents, and administrators to create, manage, and resolve support tickets.

---

## Table of Contents

- [Features](#features)
- [User Roles](#user-roles)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Authentication and Authorization](#authentication-and-authorization)
- [Ticket Lifecycle](#ticket-lifecycle)
- [Internal Notes](#internal-notes)
- [Security Features](#security-features)
- [Environment Variables](#environment-variables)
- [Installation and Setup](#installation-and-setup)
- [Database Setup and Seeding](#database-setup-and-seeding)
- [Running the Application](#running-the-application)
- [Production Build](#production-build)
- [Running Tests](#running-tests)
- [API Reference](#api-reference)
- [Role and Permission Summary](#role-and-permission-summary)
- [Troubleshooting](#troubleshooting)
- [Future Enhancements](#future-enhancements)

---

## Features

- **Role-based access control** — strict separation between Customer, Agent, and Admin roles
- **Ticket creation and management** — customers create tickets with subject, description, category, and optional priority
- **Ticket lifecycle tracking** — full status progression from OPEN to ASSIGNED to IN_PROGRESS to RESOLVED to CLOSED
- **Agent assignment** — agents self-assign tickets; admins can assign or reassign to any agent
- **Public replies** — customers and their assigned agent exchange messages on a ticket
- **Internal notes** — agents post private notes on their assigned tickets, hidden from customers
- **Priority management** — LOW / MEDIUM / HIGH / URGENT priorities, settable by agents and admins
- **Activity log** — every status change, assignment, and priority change is recorded per ticket
- **Admin user management** — create, edit, and delete users of any role
- **Admin category management** — create, rename, and delete support categories
- **Platform statistics** — admin dashboard with real-time counts by status, priority, and role
- **Responsive UI** — mobile-friendly sidebar navigation with hamburger menu on small screens
- **Protected routes** — unauthenticated users are redirected to login; wrong-role users are redirected away
- **Health endpoint** — `GET /api/health` for uptime monitoring

---

## User Roles

### CUSTOMER

Customers are end-users who raise support requests.

- Register and log in with email and password
- Create support tickets with subject, description, category, and priority
- View only their own tickets (cross-customer access is blocked server-side)
- Reply to their own open tickets
- Close their own tickets
- Cannot view internal agent notes
- Cannot access Agent or Admin pages or APIs

### AGENT

Agents are support staff who handle tickets.

- Log in with email and password (accounts created by Admin)
- View all tickets in the system
- Search and filter tickets by status, priority, and assignment
- Self-assign (claim) unassigned tickets
- Reply publicly to tickets they are assigned to
- Add internal notes (invisible to customers) to their assigned tickets
- Update status and priority of their assigned tickets
- Cannot modify tickets assigned to other agents
- Cannot access Admin pages or APIs

### ADMIN

Administrators manage the entire platform.

- Full access to all tickets, users, and categories
- Create, update, and delete users of any role
- Assign or unassign any ticket to any agent
- Update status and priority of any ticket
- Manage support categories (create, rename, delete)
- View platform-wide statistics on the admin dashboard
- Protected against self-deletion and demotion of the last admin account

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Framework  | Next.js 16.3.8 (App Router)         |
| Language   | TypeScript 5                        |
| Styling    | Tailwind CSS 4                      |
| ORM        | Prisma 5                            |
| Database   | SQLite (via `prisma/dev.db`)        |
| Auth       | JWT (`jose`) in `httpOnly` cookies  |
| Hashing    | Node.js `crypto.scryptSync`         |
| Runtime    | Node.js 18+                         |
| Build Tool | Turbopack (Next.js built-in)        |

---

## Project Structure

```
customer-support-ticket-management/
├── prisma/
│   ├── schema.prisma          # Database schema (SQLite)
│   ├── seed.mjs               # Seed script with demo users and tickets
│   └── dev.db                 # SQLite database file (git-ignored)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # login, logout, register, me
│   │   │   ├── tickets/       # Customer ticket CRUD + messages + close
│   │   │   ├── categories/    # Category listing (auth required)
│   │   │   ├── agent/         # Agent ticket management APIs
│   │   │   ├── admin/         # Admin user, ticket, and category APIs
│   │   │   └── health/        # Health check endpoint
│   │   ├── admin/             # Admin UI pages (dashboard, users, tickets, categories)
│   │   ├── agent/             # Agent UI pages (dashboard, tickets)
│   │   ├── customer/          # Customer UI pages (dashboard, tickets)
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   └── page.tsx           # Root redirect page
│   ├── components/
│   │   ├── AdminSidebar.tsx   # Admin navigation sidebar
│   │   ├── AgentSidebar.tsx   # Agent navigation sidebar
│   │   ├── CustomerSidebar.tsx# Customer navigation sidebar
│   │   ├── Badges.tsx         # StatusBadge and PriorityBadge components
│   │   ├── LogoutButton.tsx   # Logout button component
│   │   └── UIState.tsx        # EmptyState and loading skeleton components
│   ├── lib/
│   │   ├── auth.ts            # JWT helpers, session management, role guards
│   │   └── prisma.ts          # Prisma client singleton
│   └── proxy.ts               # Next.js middleware for route protection and redirects
├── test-auth.js               # Phase 3: Authentication tests (15 tests)
├── test-tickets.js            # Phase 4: Customer ticket tests (36 tests)
├── test-agent.js              # Phase 5: Agent ticket tests (30 tests)
├── test-admin.js              # Phase 6: Admin management tests (48 tests)
├── .env.example               # Environment variable template
├── Dockerfile                 # Docker image definition
├── docker-compose.yml         # Docker Compose for containerized deployment
├── next.config.ts             # Next.js configuration
├── package.json               # Project dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

---

## Authentication and Authorization

### Session Management

- Authentication uses **JWT tokens** stored in **`httpOnly` cookies** (cookie name: `session`)
- Tokens are signed with **HS256** using `JWT_SECRET` from environment variables
- Sessions expire after **24 hours**
- The `secure` cookie flag is enabled in production (`NODE_ENV=production`)
- `sameSite: lax` is set to mitigate CSRF attacks

### Password Hashing

- Passwords are hashed using **Node.js `crypto.scryptSync`** with a random 16-byte salt
- The `passwordHash` field is **never returned** in any API response

### Route Protection (Middleware)

- `src/proxy.ts` acts as Next.js middleware and protects all `/customer/*`, `/agent/*`, and `/admin/*` routes
- Unauthenticated users are redirected to `/login`
- Authenticated users accessing the wrong role's section are redirected to `/login`
- Authenticated users on `/login` or `/register` are redirected to their role's dashboard

### Server-Side Authorization

- Every API route re-validates the session independently via `getCurrentUser()`
- `customerId` is always taken from the authenticated session, never from the request body
- `agentId` and `role` supplied by the client are never trusted for authorization decisions
- Agents can only modify tickets that are assigned to them

---

## Ticket Lifecycle

```
OPEN -> ASSIGNED -> IN_PROGRESS -> WAITING_FOR_CUSTOMER -> RESOLVED -> CLOSED
                    ^                                                       |
                    +----------------------- REOPENED ----------------------+
```

| Status                 | Set By             | Meaning                                        |
|------------------------|--------------------|------------------------------------------------|
| `OPEN`                 | System (on create) | New ticket, not yet assigned                   |
| `ASSIGNED`             | Agent / Admin      | Agent has been assigned, work not yet started  |
| `IN_PROGRESS`          | Agent / Admin      | Agent is actively working on the ticket        |
| `WAITING_FOR_CUSTOMER` | Agent / Admin      | Pending customer response                      |
| `RESOLVED`             | Agent / Admin      | Issue resolved, awaiting customer confirmation |
| `CLOSED`               | Customer / Admin   | Ticket fully closed                            |
| `REOPENED`             | Agent / Admin      | Closed ticket re-opened for further action     |

**Business rules:**

- Customers can close their own tickets via `PUT /api/tickets/:id/close`
- Closed tickets cannot receive new replies (returns `400`)
- When an agent self-assigns an `OPEN` ticket, status auto-advances to `ASSIGNED`
- When an admin assigns an `OPEN` ticket to an agent, status auto-advances to `ASSIGNED`
- Resolving a ticket records `resolvedAt`; closing records `closedAt`

---

## Internal Notes

- Agents can post internal notes on tickets they are assigned to via `POST /api/agent/tickets/:id/notes`
- Internal notes are stored with `isInternal: true` in the `TicketMessage` table
- The customer-facing ticket detail API (`GET /api/tickets/:id`) filters out all messages where `isInternal` is `true`
- Internal notes are visible to agents and admins only
- Customers never see internal notes through any API or UI

---

## Security Features

| Feature                       | Implementation                                                             |
|-------------------------------|----------------------------------------------------------------------------|
| JWT secret enforcement        | App throws on startup if `JWT_SECRET` is not set                          |
| `httpOnly` cookies            | JWT token is inaccessible to JavaScript in the browser                    |
| Password hashing              | `scryptSync` with random salt per password                                |
| `passwordHash` never exposed  | Excluded from all Prisma `select` calls in API responses                  |
| Session-sourced identity      | `customerId`, `agentId`, `role` always from verified JWT, never request body |
| Cross-customer isolation      | Customers can only read/write their own tickets; enforced server-side     |
| Agent ticket scope            | Agents can only reply, update status/priority, and add notes to their assigned tickets |
| Last-admin protection         | Cannot delete or demote the last remaining admin account                  |
| Cascade deletes blocked       | Users with related tickets, messages, or activities cannot be deleted     |
| Internal notes hidden         | Customer ticket API filters `isInternal: true` messages                   |
| Closed ticket reply blocked   | `400` returned if replying to a closed ticket                             |
| Input validation              | All API routes validate types, required fields, and enumerated values     |
| Duplicate prevention          | Unique constraints on email and category name; `409` on conflict          |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values before running the application.

```env
# Database (SQLite file path relative to prisma/)
DATABASE_URL="file:./dev.db"

# Next.js application base URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT secret - REQUIRED. Generate a long random string (32+ characters).
# Never commit your real secret. Never use the placeholder value in production.
JWT_SECRET="generate-a-secure-random-string-here"
```

**Generating a secure `JWT_SECRET`:**

```bash
# On Linux/macOS:
openssl rand -hex 32

# Using Node.js (cross-platform):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Warning:** The application will crash on startup if `JWT_SECRET` is not set in the environment.

---

## Installation and Setup

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **npm 9+** (bundled with Node.js)
- **Git**

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/customer-support-ticket-management.git
cd customer-support-ticket-management

# 2. Install dependencies
npm install

# 3. Set up environment variables
copy .env.example .env
# Edit .env and set a real JWT_SECRET value
```

---

## Database Setup and Seeding

The project uses **SQLite** via Prisma. The database file is created locally at `prisma/dev.db`.

```bash
# Apply the schema to create the database
npx prisma db push

# Seed with demo users and sample tickets
npx prisma db seed
```

### Seeded Demo Accounts

| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| ADMIN    | admin@example.com      | admin123    |
| AGENT    | agent@example.com      | agent123    |
| CUSTOMER | customer1@example.com  | customer123 |
| CUSTOMER | customer2@example.com  | customer123 |

> **Note:** These credentials are for local development only. Change all passwords before any public deployment.

### Seeded Categories

The seed creates 7 categories: `Technical Issue`, `Billing`, `Account`, `Login Problem`, `Bug Report`, `Feature Request`, `Other`.

### Seeded Tickets

5 sample tickets are created across different statuses (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `RESOLVED`) to demonstrate the full ticket lifecycle.

---

## Running the Application

```bash
# Start the development server
npm run dev
```

The application will be available at: **http://localhost:3000**

Navigate to `/login` and sign in with any seeded account to explore the role-specific interfaces.

---

## Production Build

```bash
npm run build
npm start
```

Or with Docker (note: `docker-compose.yml` is configured for PostgreSQL; update `DATABASE_URL` accordingly):

```bash
docker-compose up --build
```

---

## Running Tests

The project includes four test suites that run against a **live development server**. Start the server first, then run the tests in a separate terminal.

```bash
# Terminal 1 - start the dev server
npm run dev

# Terminal 2 - run each suite
node test-auth.js
node test-tickets.js
node test-agent.js
node test-admin.js
```

### All Tests in One Command (Windows CMD)

```cmd
cmd /c "node test-auth.js & node test-tickets.js & node test-agent.js & node test-admin.js"
```

### Test Results

| Suite            | File            | Tests       | Phase |
|------------------|-----------------|-------------|-------|
| Authentication   | test-auth.js    | 15/15       | 3     |
| Customer Tickets | test-tickets.js | 36/36       | 4     |
| Agent Tickets    | test-agent.js   | 30/30       | 5     |
| Admin Management | test-admin.js   | 48/48       | 6     |
| **Total**        |                 | **129/129** |       |

### What Each Suite Tests

**test-auth.js** — Registration, login, logout, duplicate registration, cookie handling, role-based redirect enforcement, `passwordHash` never exposed in responses.

**test-tickets.js** — Unauthenticated access prevention, ticket creation validation, category fetching, ticket listing (own-only for customers), cross-customer access prevention (403), reply to own ticket, search and filter, close ticket, reply to closed ticket (400), `/api/auth/me` endpoint.

**test-agent.js** — Agent and customer access control, ticket listing, ticket detail, agent self-assign, status updates, priority updates, internal note creation, internal note not visible to customer, public reply, agent blocked from replying/updating/noting on unassigned tickets (403).

**test-admin.js** — Admin authorization checks, user listing, creation, update, deletion, role validation, last-admin protection, ticket listing, filtering, and detail, assign and unassign tickets, status and priority updates, category CRUD, duplicate name prevention, category-with-tickets deletion prevention.

---

## API Reference

All API routes return JSON. Authentication requires a valid `session` cookie obtained from `POST /api/auth/login`.

### Authentication

| Method | Route                | Auth | Role | Description                           |
|--------|----------------------|------|------|---------------------------------------|
| POST   | `/api/auth/register` | No   | —    | Register a new CUSTOMER account       |
| POST   | `/api/auth/login`    | No   | —    | Log in; sets `session` cookie         |
| POST   | `/api/auth/logout`   | Yes  | Any  | Clear the session cookie              |
| GET    | `/api/auth/me`       | Yes  | Any  | Return the current authenticated user |

**Register body:** `{ "name": "Jane", "email": "jane@example.com", "password": "secret123" }`

**Login body:** `{ "email": "jane@example.com", "password": "secret123" }`

---

### Categories

| Method | Route             | Auth | Role | Description                     |
|--------|-------------------|------|------|---------------------------------|
| GET    | `/api/categories` | Yes  | Any  | List all categories (id + name) |

---

### Customer Tickets

| Method | Route                       | Auth | Role                    | Description                                       |
|--------|-----------------------------|------|-------------------------|---------------------------------------------------|
| POST   | `/api/tickets`              | Yes  | CUSTOMER                | Create a new ticket                               |
| GET    | `/api/tickets`              | Yes  | Any                     | List tickets (customers see only their own)       |
| GET    | `/api/tickets/:id`          | Yes  | Any (customer: own only)| Get ticket detail; internal notes filtered out    |
| POST   | `/api/tickets/:id/messages` | Yes  | CUSTOMER / AGENT        | Post a public reply                               |
| PUT    | `/api/tickets/:id/close`    | Yes  | CUSTOMER / AGENT / ADMIN| Close a ticket                                    |

**Create ticket body:**
```json
{
  "title": "Cannot log in",
  "description": "Getting error 500 on login page",
  "categoryId": "<uuid>",
  "priority": "HIGH"
}
```

`priority` defaults to `MEDIUM` if omitted or invalid. `customerId` is always sourced from the authenticated session.

**Query parameters for GET /api/tickets:**
- `status` — e.g. `OPEN`, `CLOSED`
- `priority` — e.g. `URGENT`
- `categoryId` — category UUID
- `search` — searches ticket number and subject

---

### Agent Ticket Management

All routes require `AGENT` or `ADMIN` role.

| Method | Route                              | Description                                              |
|--------|------------------------------------|----------------------------------------------------------|
| GET    | `/api/agent/tickets`               | List all tickets with filtering                          |
| GET    | `/api/agent/tickets/:id`           | Get full ticket detail (messages + activities)           |
| POST   | `/api/agent/tickets/:id/assign`    | Self-assign an unassigned ticket (agents only)           |
| PUT    | `/api/agent/tickets/:id/status`    | Update status (agents: assigned tickets only)            |
| PUT    | `/api/agent/tickets/:id/priority`  | Update priority (agents: assigned tickets only)          |
| POST   | `/api/agent/tickets/:id/notes`     | Add an internal note (agents: assigned tickets only)     |

**Query parameters for GET /api/agent/tickets:**
- `status`, `priority`, `categoryId` — standard filters
- `assignment` — `mine` or `unassigned`
- `search` — ticket number, title, or customer name/email

**Valid statuses:** `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `RESOLVED`, `CLOSED`, `REOPENED`

**Valid priorities:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`

---

### Admin Management

All routes require `ADMIN` role.

#### Users

| Method | Route                  | Description                                            |
|--------|------------------------|--------------------------------------------------------|
| GET    | `/api/admin/users`     | List users; filter by `role` or `search`               |
| POST   | `/api/admin/users`     | Create a user with any role                            |
| PUT    | `/api/admin/users/:id` | Update name, email, password, or role                  |
| DELETE | `/api/admin/users/:id` | Delete user (blocked if user has related records)      |

#### Tickets

| Method | Route                              | Description                                                         |
|--------|------------------------------------|---------------------------------------------------------------------|
| GET    | `/api/admin/tickets`               | List all tickets; filter by status, priority, category, agent, customer, search |
| GET    | `/api/admin/tickets/:id`           | Get ticket detail (messages + activities)                           |
| PUT    | `/api/admin/tickets/:id/assign`    | Assign or unassign ticket; set `agentId: null` to unassign          |
| PUT    | `/api/admin/tickets/:id/status`    | Update ticket status                                                |
| PUT    | `/api/admin/tickets/:id/priority`  | Update ticket priority                                              |

#### Categories

| Method | Route                        | Description                                          |
|--------|------------------------------|------------------------------------------------------|
| GET    | `/api/admin/categories`      | List categories with ticket count                    |
| POST   | `/api/admin/categories`      | Create a new category                                |
| PUT    | `/api/admin/categories/:id`  | Update category name or description                  |
| DELETE | `/api/admin/categories/:id`  | Delete category (blocked if any tickets reference it)|

---

### Health Check

| Method | Route         | Auth | Description                   |
|--------|---------------|------|-------------------------------|
| GET    | `/api/health` | No   | Returns `{ "status": "ok" }` |

---

## Role and Permission Summary

| Action                             | CUSTOMER | AGENT | ADMIN |
|------------------------------------|----------|-------|-------|
| Register                           | Yes      | Yes   | Yes   |
| Login / Logout                     | Yes      | Yes   | Yes   |
| Create ticket                      | Yes      | No    | No    |
| View own tickets                   | Yes      | —     | —     |
| View all tickets                   | No       | Yes   | Yes   |
| Reply to own ticket                | Yes      | —     | —     |
| Reply to assigned ticket           | —        | Yes   | —     |
| Close own ticket                   | Yes      | —     | Yes   |
| Self-assign unassigned ticket      | No       | Yes   | —     |
| Assign any ticket to any agent     | No       | No    | Yes   |
| Update status (assigned tickets)   | No       | Yes   | Yes   |
| Update priority (assigned tickets) | No       | Yes   | Yes   |
| Add internal note (assigned)       | No       | Yes   | Yes   |
| See internal notes                 | No       | Yes   | Yes   |
| Manage users                       | No       | No    | Yes   |
| Manage categories                  | No       | No    | Yes   |
| Access admin dashboard             | No       | No    | Yes   |
| Access agent dashboard             | No       | Yes   | No    |
| Access customer dashboard          | Yes      | No    | No    |

---

## Troubleshooting

### npm is blocked on Windows PowerShell

PowerShell may reject npm scripts due to execution policy restrictions.

**Solution — use CMD instead:**

```cmd
cmd /c "npm run dev"
cmd /c "npm run build"
cmd /c "node test-auth.js"
```

**Alternative — allow scripts for the current session:**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

### Application crashes: `JWT_SECRET environment variable is not configured`

The `.env` file is missing or does not contain `JWT_SECRET`.

**Solution:**

1. Copy `.env.example` to `.env` if it does not exist
2. Set a real value: `JWT_SECRET="your-long-random-secret-here"`
3. Restart the dev server

---

### `ENOENT: no such file or directory 'prisma/dev.db'`

The database has not been created yet.

**Solution:**

```bash
npx prisma db push
npx prisma db seed
```

---

### Prisma client out of sync

If `schema.prisma` is changed, regenerate the client:

```bash
npx prisma generate
```

---

### Tests fail with `ECONNREFUSED`

The test scripts require the dev server to be running.

**Solution:** Run `npm run dev` in a separate terminal before executing any test script.

---

### `Cannot find module '@/lib/auth'`

TypeScript path aliases are configured in `tsconfig.json`. If the error persists, restart your editor's TypeScript language server.

---

## Future Enhancements

The following features are not currently implemented and represent natural next steps:

- **Email notifications** — notify customers when ticket status changes or an agent replies
- **File attachments** — allow screenshots or documents to be uploaded on tickets
- **SLA tracking** — define response time targets per priority and alert when breached
- **Real-time updates** — WebSocket or Server-Sent Events for live ticket updates
- **Pagination** — cursor-based or offset pagination on all list endpoints
- **Rate limiting** — per-IP limits on auth endpoints to prevent brute-force attacks
- **Two-factor authentication** — TOTP-based 2FA for ADMIN and AGENT accounts
- **Customer satisfaction ratings** — allow customers to rate resolved tickets
- **Dark mode** — system-aware or user-toggleable dark theme
- **PostgreSQL migration** — switching databases requires only a Prisma `datasource` change and updated `DATABASE_URL`
- **i18n support** — localize the UI for multiple languages
