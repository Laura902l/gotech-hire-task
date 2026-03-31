# GoTech Chat — Engineering Hiring Evaluation

A real-time chat application built with **NestJS + React + PostgreSQL + Socket.IO**. This project is used to evaluate full-stack engineering candidates at GoTech.

## Candidate Task

You are reviewing a codebase written by a developer in a hurry. The application works, but it contains **realistic engineering flaws** across four categories. Your job is to:

1. **Identify** the issues in each category
2. **Fix** as many as you can until your deadline
3. **Fork the repo** 
4. **Submit a PR** to your fork with your changes + a short write-up explaining each fix

You are allowed to use whatever you want, but you have to fully understand the final solution. 
> **Depth over breadth.** A thorough fix with clear reasoning beats a shallow scan.

---

## Features

- User registration and login with JWT authentication
- Create and join chat rooms
- Real-time messaging via WebSockets
- Message history per room

---

## Getting Started

### Prerequisites
- Docker and Docker Compose

### Run the App

```bash
cp .env.example .env
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

---

## Known Issue Areas

The following categories contain real engineering problems. The description tells you *what kind* of issue exists — not how to fix it. Part of the evaluation is finding the specific locations.

### Architecture & Design

- The backend has no feature module structure — all providers, controllers, and entities are registered in a single flat module
- One service handles concerns from multiple domains with no separation
- A controller contains logic that belongs in the service layer
- DTOs are defined but never enforced by the framework
- The frontend has a single component exceeding 400 lines handling too many responsibilities
- State is passed down through 4–5 component levels unnecessarily

### Security

- Passwords are hashed using a cryptographically broken algorithm
- A sensitive configuration value is hardcoded in source code in two separate files
- One API endpoint exposes sensitive user data to any authenticated caller
- WebSocket messages trust a value supplied by the client without server-side verification
- A frontend component renders user content in a way that allows script injection

### Performance

- A database query pattern results in N+1 queries for a common operation
- No indexes are defined on frequently-queried foreign key columns
- Message history has no pagination — all messages are loaded at once
- On every real-time event, the frontend discards existing data and re-fetches everything from the server
- A WebSocket connection is recreated on every render cycle

### Code Quality

- A deprecated/cryptographically weak import is left commented out alongside its replacement
- `console.log` statements remain in production paths
- Untyped (`any`) is used for function parameters and return types throughout
- Magic strings and magic numbers appear in multiple files without constants
- One component uses a different paradigm than the rest of the codebase
- `snake_case` and `camelCase` naming conventions are mixed within a single entity
- Array indexes are used as React list keys

---

## Evaluation Rubric

| Category | Weight | What we look for |
|---|---|---|
| Issue Identification | 20% | Did you find the actual code locations, not just the category descriptions? |
| Security Fixes | 25% | Correct algorithm choices, no new vulnerabilities introduced |
| Architecture | 20% | Reasonable module boundaries, separation of concerns |
| Performance | 15% | Fix the query pattern, add pagination, fix real-time update logic |
| Code Quality | 10% | Consistent style, types, no dead code |
| Write-up | 10% | Clear explanation of each fix and the reasoning behind it |

---

## Tech Stack

- **Backend:** NestJS, TypeORM, PostgreSQL, Socket.IO, JWT
- **Frontend:** React 18, React Router v6, Socket.IO Client, Vite, TypeScript
- **Infrastructure:** Docker, Docker Compose

## Fixes made in this fork

Ниже приведён краткий список ключевых правок

- Security
	- Пароли теперь хэшируются с помощью bcrypt (замена уязвимого хеша). Секреты JWT/REFRESH читаются из окружения (`.env`) вместо хардкода
	- WebSocket-подключения и части API теперь проверяют и валидируют JWT: сервер не доверяет пользовательским полям из сообщений.
	- Убран вывод паролей/хешей в API: `/users` возвращает только безопасные поля.

- Performance
	- Исправлена проблема N+1 при загрузке сообщений: теперь используется JOIN для получения username вместе с сообщениями и поддерживается пагинация (page, limit).
	- Добавлены индексы на часто используемые колонки (`room_id`, `user_id`, `username`) для ускорения запросов.

- Frontend reliability and security
	- Централизован `API_URL` в `frontend/src/config.ts` - убраны жестко прописанные URL-адреса.
	- Соединение Socket.IO создаётся и ресусируется корректно через useRef/useEffect (не пересоздаётся на каждом рендере).
	- Убрано использование `dangerouslySetInnerHTML` в `MessageItem` — теперь контент рендерится как текст (закрыта XSS-уязвимость).
	- Исправлена отправка сообщений: клиент не подставляет `userId`/`senderName` — сервер присваивает отправителя из токена.

- Code quality and infra
	- Заменены `console.log` на Nest `Logger`, добавлены ValidationPipe и базовые проверки CORS для production.
	- Добавлен `env_file: .env` в `docker-compose.yml`, а также dependency `bcryptjs` в backend `package.json`.
