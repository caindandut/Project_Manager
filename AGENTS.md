# AGENTS.md - Project: PM Tool (Jira Mini)

## Project Context
- Frontend: React 19 + Vite + shadcn/ui + Tailwind CSS v3 + TanStack Query + Zustand
- Backend: Node.js + Express/Fastify + TypeScript (OOP: Repository Pattern, Service Layer, Controller)
- Database: MySQL 8 + Prisma ORM
- Auth: OAuth 2.0 Google + JWT + Refresh Token Rotation
- Architecture: Modular Monolith (BE), Component-based (FE)

## Domain Knowledge
- Workspace: Mỗi user có thể thuộc nhiều workspace với role khác nhau
- Project: Thuộc về 1 workspace, có nhiều tasks
- Task: Có status (Todo, In Progress, Review, Done), priority, assignee, due date, labels
- View modes: List, Kanban, Gantt, Calendar
- Role hierarchy: Owner (system) &gt; Member (workspace admin) &gt; Guest (read-only)

## Coding Standards
- BE: Strict OOP - Interface/Abstract class → Repository → Service → Controller
- FE: Container/Presentational pattern, custom hooks for data fetching
- Both: TDD workflow, 80%+ coverage, no `any` types
- API: RESTful, versioning (/api/v1/...), consistent error response format
