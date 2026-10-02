# Customer Support Ticket Management System

A centralized platform for managing customer support requests, tracking ticket status, and improving support operations.

## Features

- Role-based access control (Customer, Agent, Admin)
- Ticket creation and management
- Status tracking
- Commenting and activity history

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Docker

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and update the variables
3. Run `docker-compose up -d` to start the database
4. Run `npm install` to install dependencies
5. Run `npx prisma db push` to initialize the database schema
6. Run `npm run dev` to start the development server
