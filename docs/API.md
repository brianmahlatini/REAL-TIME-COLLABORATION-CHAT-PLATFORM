# API Overview

All protected routes require a bearer token in production Clerk mode. In demo mode, the frontend sends demo identity headers.

## Health

- `GET /health`

## Users

- `GET /api/me`
- `GET /api/users`

## Channels

- `GET /api/channels`
- `POST /api/channels`
- `GET /api/channels/:channelId/messages`
- `POST /api/channels/:channelId/messages`
- `POST /api/direct-messages`

## Uploads

- `POST /api/uploads` multipart file upload

## Notifications

- `POST /api/notifications/subscriptions`

## Socket Events

Client to server:

- `channel:join`
- `message:send`
- `typing:start`
- `typing:stop`
- `message:read`

Server to client:

- `presence:update`
- `message:new`
- `typing:update`
- `message:read`
- `error`
