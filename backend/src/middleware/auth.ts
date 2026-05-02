import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { upsertUser } from "../services/users.js";
import type { AuthedRequest, AuthUser } from "../types.js";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function demoUser(req: AuthedRequest): AuthUser {
  return {
    id: String(req.header("x-user-id") || "demo-user"),
    email: req.header("x-user-email") || "demo@example.com",
    name: req.header("x-user-name") || "Demo User",
    imageUrl: req.header("x-user-image") || undefined
  };
}

async function clerkUser(req: AuthedRequest): Promise<AuthUser> {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new Error("Missing bearer token");
  }

  if (!env.CLERK_JWT_ISSUER || !env.CLERK_JWKS_URL) {
    throw new Error("Clerk issuer and JWKS URL are required in clerk auth mode");
  }

  jwks ??= createRemoteJWKSet(new URL(env.CLERK_JWKS_URL));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: env.CLERK_JWT_ISSUER
  });

  return {
    id: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email : undefined,
    name:
      typeof payload.name === "string"
        ? payload.name
        : typeof payload.username === "string"
          ? payload.username
          : "Team Member",
    imageUrl: typeof payload.picture === "string" ? payload.picture : undefined
  };
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    authedReq.user = env.AUTH_MODE === "clerk" ? await clerkUser(authedReq) : demoUser(authedReq);
    await upsertUser(authedReq.user);
    next();
  } catch (error) {
    res.status(401).json({ message: error instanceof Error ? error.message : "Unauthorized" });
  }
};

export async function authFromSocket(headers: Record<string, string | string[] | undefined>, token?: string) {
  const request = {
    header(name: string) {
      const value = headers[name.toLowerCase()];
      return Array.isArray(value) ? value[0] : value;
    }
  } as AuthedRequest;

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const user = env.AUTH_MODE === "clerk" ? await clerkUser(request) : demoUser(request);
  await upsertUser(user);
  return user;
}
