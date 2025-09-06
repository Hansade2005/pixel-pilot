<general_rules>
- When creating new functions or components, first search in the relevant directory (e.g., components/, lib/, hooks/) to see if similar functionality exists. If not, create new files logically within existing or new directories.
- Always run linting before committing code using the script `npm run lint`. The linting is strict and does not allow warnings.
- Use common npm scripts for development and maintenance: `npm install` to install dependencies, `npm run dev` to start the development server, `npm run build` to build for production, and `npm run lint` to check code quality.
- Search the codebase thoroughly before adding new features to avoid duplication and maintain consistency.
</general_rules>

<repository_structure>
- The repository is structured primarily as a Next.js 14 application using the App Router.
- The `app/` directory contains the Next.js app with API routes under `app/api/`, global styles, root layout, and page components.
- The `components/` directory holds React components, including a `ui/` subfolder for shadcn/ui components.
- The `lib/` directory contains utility libraries such as the Supabase client, storage manager, and template service.
- Custom React hooks are located in the `hooks/` directory.
- Static assets are stored in the `public/` directory.
- Test files are organized under the `__tests__/` directory.
- SQL and JavaScript scripts for database setup and testing are in the `scripts/` directory.
- The project uses TypeScript, Tailwind CSS for styling, Supabase for backend services, and integrates AI tools.
- Key technologies: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Supabase backend, AI integration.
</repository_structure>

<dependencies_and_installation>
- The project uses npm as the package manager.
- Install all dependencies by running `npm install` in the root directory.
- Use `npm run dev` to start the development server.
- Use `npm run build` to build the project for production.
- Use `npm run lint` to run the linter and ensure code quality.
</dependencies_and_installation>

<testing_instructions>
- Tests are located in the `__tests__/` directory.
- The project uses Jest as the testing framework.
- Tests cover core modules such as the checkpoint system, deployment integrations, and compression utilities.
- Tests typically create test workspaces and files to verify functionality.
- Run tests using the command `npm test` or `jest`.
</testing_instructions>

<pull_request_formatting>
</pull_request_formatting>
