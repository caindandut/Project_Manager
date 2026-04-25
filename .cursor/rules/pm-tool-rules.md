---
description: "PM Tool - TypeScript/React/Node.js specific rules"
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.prisma"]
alwaysApply: true
---

## Database (Prisma + MySQL)
- Mọi model phải có `createdAt`, `updatedAt`, `deletedAt` (soft delete)
- Sử dụng `@map` và `@@map` cho snake_case naming trong DB
- Mọi relation phải có `onDelete` và `onUpdate` rõ ràng
- Không dùng raw query trừ khi có lý do performance (document lại)

## Backend OOP (Node.js + TypeScript)
- Mỗi module phải có: Interface → Repository → Service → Controller → Route
- Dependency Injection bằng constructor (không dùng global singleton trừ config/db)
- Service layer chứa business logic, không gọi Prisma trực tiếp (qua Repository)
- Controller chỉ parse request, gọi service, trả response
- DTOs phải dùng class-validator cho mọi input

## Frontend (React + shadcn/ui)
- Mọi page phải là component async (suspense boundary)
- Data fetching qua TanStack Query, không fetch trực tiếp trong component
- State global dùng Zustand (slice pattern), không dùng Context cho state phức tạp
- shadcn/ui components không modify trực tiếp, extend qua composition
- Forms dùng React Hook Form + Zod resolver

## Auth & Security
- OAuth 2.0 Google flow: Authorization Code + PKCE
- JWT access token (15 phút), refresh token (7 ngày) lưu httpOnly cookie
- Mọi API phải qua auth middleware (trừ public endpoints)
- Role-based access control (RBAC) ở middleware level
- Không bao giờ log sensitive data (token, password)

## API Design
- Response format: `{ success: boolean, data?: T, error?: { code, message, details } }`
- Pagination: cursor-based cho large lists, offset-based cho small lists (&lt; 100 items)
- Filtering: query string với operators (eq, neq, gt, gte, lt, lte, contains, in)