# docker-service

Manages the Docker containers for ClashPerk's **custom-bot** instances:
provisions, upgrades, suspends/resumes and removes per-customer bot containers,
pulling their images from AWS ECR. NestJS.

Talks to the local Docker daemon via `dockerode` and to ECR via the AWS SDK.
Deployments are serialised through a Bull queue (`DEPLOYMENT_QUEUE`, Redis).
Service records live in Mongo. The HTTP API (all routes `ApiKeyGuard`'d) covers
`POST /github-webhook`, `POST|GET /services`, `PUT /services/:id/{upgrade,suspend,resume}`,
and `DELETE /services/:id`.

## Develop

```bash
npm install
npm run start:dev   # watch mode
npm run build && npm run start:prod
npm run lint        # eslint --fix
npm test
```

Config via env (loaded from `.env` then `.env.services.env`): `PORT`, `NODE_ENV`,
`REDIS_{HOST,PORT,USERNAME,PASSWORD}`, `MONGODB_URL`, `MONGODB_DB_NAME`,
`AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET`.

See [CLAUDE.md](CLAUDE.md) for architecture and conventions.
