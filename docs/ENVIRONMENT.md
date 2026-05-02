# Environment Variables

## Required For Local Demo

- `PORT`
- `FRONTEND_URL`
- `MONGO_URI`
- `REDIS_URL`
- `AUTH_MODE=demo`
- `VITE_API_URL`
- `VITE_WS_URL`

## Clerk Production Auth

- `AUTH_MODE=clerk`
- `CLERK_JWT_ISSUER`
- `CLERK_JWKS_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`

## File Uploads

S3 is used when all required S3 values are present. Otherwise files are stored locally in `backend/uploads`.

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_PUBLIC_BASE_URL`
