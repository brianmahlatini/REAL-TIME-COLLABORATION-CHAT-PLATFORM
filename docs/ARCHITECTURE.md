# Architecture

The system is split into a React frontend and an Express backend.

## Backend

- Express exposes REST APIs for channels, messages, uploads, users, and notification subscriptions.
- Socket.io handles low-latency events: message send, typing, read receipts, and presence.
- MongoDB stores durable application data.
- Redis provides pub/sub fan-out between API instances and powers BullMQ notification jobs.
- Pino logs HTTP requests and application events.

## Realtime Scale

Each backend instance joins users to channel rooms. When a message is created, the local instance emits to connected clients and publishes an event to Redis. Other backend instances consume that event and emit it to their own clients. This allows websocket traffic to scale horizontally behind a load balancer.

## Auth

Local development uses demo mode. Production should set `AUTH_MODE=clerk` and configure Clerk JWT issuer/JWKS values so the backend verifies bearer tokens before allowing REST or socket access.

## Files

Uploads prefer S3. If S3 is not configured, the backend stores files locally and serves them from `/uploads`.
