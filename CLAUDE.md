# CLAUDE.md

Guidance for Claude Code when working in **docker-service**.

> `README.md` is the stock NestJS boilerplate — ignore it; this file is the
> real description.

## What this is

A NestJS service that manages the Docker containers for ClashPerk's **custom-bot**
instances: it provisions, upgrades, suspends/resumes and removes per-customer bot
containers, pulling their images from AWS ECR. Remote:
`clashperk/custom-bot-service` (package name `docker-service`).

## How it works

- Talks to the local Docker daemon via `dockerode` (default socket) and to **ECR**
  via `@aws-sdk/client-ecr` for image pulls.
- Service records live in Mongo (`MONGODB_URL` / `MONGODB_DB_NAME`).
- A **Bull** queue (`DEPLOYMENT_QUEUE`, backed by Redis) serialises deployments:
  `GET /github-webhook`-style triggers enqueue a job, and `DeploymentConsumer`
  (`src/app.consumer.ts`) runs `pullImageAndDeployServices()`. The queue uses a
  1-hour lock and no stalled-retries (`stalledInterval: 0`) so a slow deploy
  isn't picked up twice.

### HTTP API ([src/app.controller.ts](src/app.controller.ts))

All guarded by `ApiKeyGuard` except `GET /`:
- `POST /github-webhook` — kick a deployment
- `POST /services` / `GET /services` — create / list
- `POST /services/migrate`
- `PUT /services/:id/upgrade` (→ prod), `/suspend`, `/resume`
- `DELETE /services/:id`

## Layout

- `src/app.providers.ts` — DI providers + tokens for Docker, ECR, Mongo.
- `src/docker.service.ts` — container lifecycle (the dockerode calls).
- `src/storage.service.ts`, `src/app.service.ts`, `src/app.helper.ts` — business logic.
- `src/auth.guard.ts` — `ApiKeyGuard`. `src/app.dto.ts` — request DTOs (validated).

## Conventions

- Package manager: **npm** (`package-lock.json`). Node per Dockerfile is 24-alpine.
- `npm run start:dev` / `npm run build` / `npm run start:prod`.
- `npm run lint`, `npm run format`, `npm test`.
- Config is env via `@nestjs/config`, loaded from `.env` then `.env.services.env`:
  `PORT`, `NODE_ENV`, `REDIS_{HOST,PORT,USERNAME,PASSWORD}` (required — `getOrThrow`),
  `MONGODB_URL`, `MONGODB_DB_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET`
  (region is hard-coded `us-east-1`).
- Comments: follow the workspace `CLAUDE.md` engineering rules (WHY only, ≤3
  consecutive comment lines).

Operates on **real** containers and prod data when pointed at prod env/socket —
don't run lifecycle actions casually.
