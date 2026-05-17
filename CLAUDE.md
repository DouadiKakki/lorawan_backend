# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Commands

```bash
npm run start:dev      # development with watch mode
npm run build          # compile to dist/
npm run start:prod     # run compiled output
npm run lint           # ESLint with auto-fix
npm run format         # Prettier format
npm run test           # unit tests (Jest)
npm run test:watch     # unit tests watch mode
npm run test:cov       # coverage report
npm run test:e2e       # end-to-end tests
npm run seed           # seed database via ts-node src/seed.ts
```

Single test file: `npx jest src/path/to/file.spec.ts`

## Environment Setup

Copy `.env.example` to `.env`. Required vars:

```
MONGODB_URI=mongodb://localhost:27017/lorawan
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<different-strong-secret>
MQTT_BROKER_URL=mqtt://localhost:1883
```

## Architecture

NestJS REST API + WebSocket backend for a LoraWan network server. MongoDB via Mongoose. Real-time updates via Socket.io. LoraWan data ingested via MQTT.

**Data flow:** LoraWan Gateway → MQTT Broker → `MqttModule` → EventEmitter → `UplinkMessagesModule` (persist) + `WebsocketModule` (push to clients)

**Module structure:** Each feature module under `src/<feature>/` has: `schemas/` (Mongoose), `dto/` (validation), `*.service.ts`, `*.controller.ts`, `*.module.ts`.

**Feature modules:**
- `auth` — JWT (15m access / 7d refresh), Passport, RolesGuard, bcrypt
- `users` — user CRUD
- `companies` — company/org management
- `applications` — LoraWan application records
- `gateways` — gateway management
- `end-devices` — end device management
- `uplinks` — uplink message storage and querying (gatewayEUI filter + stats endpoints)
- `integrations` — third-party integration configs
- `mqtt` — MQTT client connecting to broker, emits events on uplink receive
- `websocket` — Socket.io gateway, subscribes to EventEmitter, pushes to connected clients

**Auth pattern:** Routes protected with `@UseGuards(JwtAuthGuard)`. Role restriction via `@Roles(...)` + `RolesGuard`. Both guards must be applied together.

**Validation:** Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` — DTOs must use `class-validator` decorators; extra fields are rejected.
