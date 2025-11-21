# Project Overview

This is a Next.js project bootstrapped with `create-next-app`. It's a multi-tenant SaaS platform that uses Supabase for its backend. The application allows a "super admin" to create new tenants (companies), and then users of those tenants can log in and access different modules based on their permissions.

## Technologies Used

*   **Framework:** [Next.js](https://nextjs.org/) (a React framework)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Backend as a Service (BaaS):** [Supabase](https://supabase.io/) for database, authentication, and serverless functions.
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Linting:** [ESLint](https://eslint.org/)

## Architecture

The application follows the Next.js App Router paradigm, with pages and server actions organized within the `app` directory.

*   **Authentication:** Handled by Supabase. There's a distinction between regular users and a "super admin".
*   **Multi-tenancy:** The data model is designed around tenants, with users belonging to a specific tenant and having access to modules enabled for that tenant.
*   **Admin Functionality:** A dedicated section (`/admin/create`) allows a super admin to provision new tenants, including creating the tenant, the initial user, and assigning a module.

# Building and Running

## Prerequisites

*   Node.js and npm (or yarn/pnpm/bun)
*   A Supabase project with the required database schema.

## Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Environment Variables

Create a `.env.local` file in the root of the project and add the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

## Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Building for Production

```bash
npm run build
```

## Running in Production Mode

```bash
npm run start
```

# Development Conventions

*   **Coding Style:** The project uses ESLint to enforce a consistent coding style. Run `npm run lint` to check for linting errors.
*   **Server-side Logic:** Server-side logic, especially database interactions, is handled in `actions.ts` files within the respective page directories. This leverages Next.js Server Actions.
*   **Database Schema:** The database schema is managed in Supabase. Key tables include:
    *   `profiles`: Stores user profiles, including the `is_super_admin` flag.
    *   `tenants`: Stores tenant information (name, slug, etc.).
    *   `tenant_members`: Links users to tenants and defines their role (e.g., 'owner').
    *   `tenant_modules`: Defines which modules are enabled for each tenant.
