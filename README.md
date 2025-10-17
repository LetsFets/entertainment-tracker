# Simple full-stack starter

Used deps:

- Main framework: Next.js
- DB: SQLite
- ORM: Drizzle
- Styling: Tailwind v4
- Auth: better-auth
- Components: shadcn/ui (radix-ui based)


## Getting Started

### (0. Install pnpm)

See [pnpm Installation Guide](https://pnpm.io/installation).


### 1. Install all dependencies 

```bash
pnpm i
```

You do this whenever new dependencies should get installed

### 2. Initialize the database

```bash
pnpm db:push
```

This command creates a (.gitignore'd) SQLite DB file in src/db/localdb.sqlite.

*You also use this command later to push the changes to the schema into the database!*

### 3. Running the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Dev agent compatibility

This project defines a AGENTS.md file for context and rules for coding agents. Feel free to use it as additional info when asking other external chat tools as well!


### Recommended dependencies

- If you build tables, it's highly recommended to store pagination, sorting and filtering state in search params. Use [nuqs](https://nuqs.dev/) for that. Use [TanStack Table](https://tanstack.com/table/latest) for base table components.
- If you really need client-side data fetching, use [SWR](https://swr.vercel.app/) or [TanStack Query](https://tanstack.com/query/v5/docs/framework/react/overview) instead of fetch calls in "useEffect" hooks.
- If the manual validation and middleware boilerplate in your server actions get's too much, build your server actions with [next-safe-action](https://next-safe-action.dev/)


### Recommended MCPs

If you use tooling that allows integration of MCP servers, I recommend the following ones:

- [Context7 by upstash](https://upstash.com/blog/context7-mcp)
    - Returns up-to-date info about all kinds of dependencies

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Next.js templates](https://vercel.com/templates/next.js) - need other functionality? Look here for other cool templates

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
