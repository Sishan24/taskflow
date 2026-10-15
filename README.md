# TaskFlow REST API

Production-grade, secure, and developer-friendly REST API for project workspace management, task coordination, and team collaboration. Built with Node.js LTS, Express, and MongoDB (Mongoose), utilizing ES Modules and strict Zod validation throughout.

---

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture & Design Principles](#architecture--design-principles)
4. [Assumptions & Design Decisions](#assumptions--design-decisions)
5. [Environment Variables](#environment-variables)
6. [Getting Started & Local Setup](#getting-started--local-setup)
7. [Running Tests](#running-tests)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Example cURL Commands](#example-curl-commands)
10. [Postman Collection](#postman-collection)
11. [Deployment to Render](#deployment-to-render)

---

## Overview

TaskFlow is designed to empower software teams to organize projects, track actionable tasks with priorities and deadlines, assign responsibilities, and collaborate via threaded task comments. The codebase is organized according to production best practices with centralized error handling, asynchronous wrappers, role-based authorization, rate limiting, and NoSQL injection protection.

---

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Node.js LTS** (v20+) | High-performance JavaScript runtime |
| **Express** | Minimalist web application framework |
| **MongoDB & Mongoose** | NoSQL document database and Object Data Modeling (ODM) |
| **Zod** | Schema declaration and static type/runtime validation |
| **bcryptjs** | Adaptive salted password hashing |
| **jsonwebtoken (JWT)** | Stateless authentication tokens |
| **Helmet** | HTTP security response headers |
| **CORS** | Cross-Origin Resource Sharing control |
| **express-rate-limit** | IP-based request throttling against brute force and DDoS |
| **express-mongo-sanitize** | NoSQL query injection prevention |
| **Jest & Supertest** | Automated end-to-end and integration testing framework |
| **mongodb-memory-server** | Ephemeral in-memory MongoDB instance for fast, isolated tests |

---

## Architecture & Design Principles

```
TaskFlow Architecture
 ├── src/
 │   ├── config/          # Environment variable validation & MongoDB connection
 │   ├── controllers/     # Route handlers wrapped with asyncHandler
 │   ├── middleware/      # Auth, authorization, error handling, rate limiting
 │   ├── models/          # Mongoose data models (User, Project, Task, Comment)
 │   ├── routes/          # Express Routers with self-documenting intent headers
 │   ├── utils/           # AppError, asyncHandler, pagination helpers
 │   ├── validators/      # Zod validation schemas
 │   ├── app.js           # Express app instance and middleware pipeline
 │   └── server.js        # Server listener and graceful process termination
 ├── tests/               # 100% automated integration test suite
 ├── postman/             # Postman Collection v2.1 with dynamic authentication
 └── docs/                # Comprehensive backend engineering study guide
```

---

## Assumptions & Design Decisions

1. **Partial Cascade Deletion**: Deletion of projects and tasks cascades sequentially through comments and tasks without requiring replica-set MongoDB transactions. In the rare event of server failure mid-cascade, remaining entities remain safely queryable, and clients can safely retry deletion idempotently.
2. **Preventing Resource Existence Leakage**: Non-members attempting to access a project via `GET /api/projects/:id` receive a `404 Not Found` rather than `403 Forbidden`. This security measure ensures unauthorized actors cannot enumerate or determine the existence of private projects.
3. **Role-Based Project Deletion**: System administrators (`admin` role) have elevated privileges to delete any project in the system (e.g., for moderation or policy compliance). However, administrators cannot update or tamper with project metadata—only the original owner can update project details.
4. **Flexible Due Date Formatting**: The `dueDate` field supports both full ISO 8601 strings (`2026-10-15T12:00:00.000Z`) and simplified calendar dates (`YYYY-MM-DD`).
5. **Project Membership Invariant**: The project `members` array is always guaranteed to include the project owner from creation throughout the lifecycle of the project.
6. **Consistent JSON Error Formatting**: All errors, including 404s and 429 rate limit errors, strictly follow the JSON response contract: `{ success: false, message: string }`.

---

## Environment Variables

TaskFlow strictly validates process environment variables at startup using Zod. If any required variable is missing, the application halts immediately with clear diagnostics.

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `PORT` | No | `5000` | Port on which the HTTP server listens |
| `MONGO_URI` | **Yes** | - | MongoDB connection URI string |
| `JWT_SECRET` | **Yes** | - | Secret string used to sign and verify JWTs |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration duration (e.g., `7d`, `24h`) |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-delimited list of permitted CORS origins |
| `BCRYPT_SALT_ROUNDS` | No | `10` | Salt rounds for password hashing |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limiting sliding window in ms (15 minutes) |
| `RATE_LIMIT_MAX` | No | `100` | Maximum requests per IP within the rate limit window |

---

## Getting Started & Local Setup

### Prerequisites
- Node.js LTS (v20 or later)
- MongoDB instance (local or MongoDB Atlas URI)
- Git

### Installation
1. Clone the repository and navigate into the root directory:
   ```bash
   git clone <repo-url> C:\taskflow
   cd C:\taskflow
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local environment configuration:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to provide a valid `MONGO_URI` and `JWT_SECRET`.

4. Start development server with live reload:
   ```bash
   npm run dev
   ```

5. Or start the production server:
   ```bash
   npm start
   ```

---

## Running Tests

TaskFlow uses Jest, Supertest, and `mongodb-memory-server` for zero-configuration, fully isolated testing. The test suite spins up an in-memory MongoDB database and runs the 19 integration test suites with zero external dependencies.

```bash
npm test
```

---

## API Endpoints Reference

All endpoints return JSON responses. Every error response guarantees the shape `{ success: false, message: "..." }`.

| # | Method | Path | Access | Description |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `GET` | `/health` | Public | Service health and liveness check |
| 2 | `POST` | `/api/auth/register` | Public | Register new user account |
| 3 | `POST` | `/api/auth/login` | Public | Authenticate user credentials & receive token |
| 4 | `GET` | `/api/users/me` | Authenticated | Retrieve current user profile |
| 5 | `GET` | `/api/users` | Admin Only | List all registered users (paginated) |
| 6 | `POST` | `/api/projects` | Authenticated | Create a new project workspace |
| 7 | `GET` | `/api/projects` | Authenticated | List all projects where user is owner or member |
| 8 | `GET` | `/api/projects/:id` | Member/Owner | Get project details (404 for non-members) |
| 9 | `PATCH` | `/api/projects/:id` | Project Owner | Update project title or description |
| 10 | `DELETE` | `/api/projects/:id` | Owner / Admin | Delete project and cascade delete tasks & comments |
| 11 | `POST` | `/api/projects/:id/members` | Project Owner | Add a user to project by email or userId |
| 12 | `POST` | `/api/projects/:id/tasks` | Project Member | Create a task within the project |
| 13 | `GET` | `/api/projects/:id/tasks` | Project Member | List tasks with filters, sorting, and pagination |
| 14 | `PATCH` | `/api/tasks/:id` | Creator / Assignee | Update task status, priority, or details |
| 15 | `DELETE` | `/api/tasks/:id` | Creator / Owner | Delete task and cascade delete comments |
| 16 | `POST` | `/api/tasks/:id/comments` | Project Member | Add a comment to a task thread |

---

## Example cURL Commands

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Johnson","email":"alice@example.com","password":"Password123!"}'
```

### 2. Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123!"}'
```

### 3. Create Project
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"TaskFlow Core Engine","description":"Building high-performance REST APIs"}'
```

### 4. Create Task
```bash
curl -X POST http://localhost:5000/api/projects/<PROJECT_ID>/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Implement Auth Flow","priority":"high","dueDate":"2026-11-01"}'
```

### 5. Filter & Sort Tasks
```bash
curl -X GET "http://localhost:5000/api/projects/<PROJECT_ID>/tasks?status=todo&priority=high&sort=-dueDate&page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Postman Collection

Import `postman/TaskFlow.postman_collection.json` into Postman.
- Configured collection variables: `baseUrl` (`http://localhost:5000`) and `token`.
- The **Login User** request automatically extracts and stores the JWT token into the collection's `token` variable, seamlessly authenticating subsequent requests.

---

## Deployment to Render

The repository includes a ready-to-deploy `render.yaml` blueprint:
1. Push your repository to GitHub or GitLab.
2. In the Render Dashboard, select **New** > **Blueprint**.
3. Link this repository. Render automatically configures:
   - Environment: `node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`
4. Set the `MONGO_URI` environment variable in your Render service dashboard.
