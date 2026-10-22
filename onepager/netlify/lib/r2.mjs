// Shared Cloudflare R2 setup for the story functions.
// Credentials come from Netlify env vars (see README.md).
// Lives outside functions/ so Netlify doesn't publish it as an endpoint.

import { S3Client } from "@aws-sdk/client-s3";

export const BUCKET = process.env.R2_BUCKET;
export const MAX_MB = 400;                    // must match MAX_MB in public/script.js
export const KEY_PREFIX = "stories/";

const REQUIRED = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const json = (body, status = 200) => Response.json(body, { status });

// stories/2026-10-22-A7F3
export const newKey = () =>
  `${KEY_PREFIX}${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

/** POST-only and configured, or a Response to send back. */
export function guard(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) return json({ error: `Not configured: ${missing.join(", ")}` }, 500);

  return null;
}

/** Push a phone notification through ntfy, if NTFY_TOPIC is set. Never throws. */
export async function notify(message) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  await fetch(`https://ntfy.sh/${topic}`, {
    method: "POST",
    headers: { Title: "New HardBreaks story", Tags: "heart" },
    body: message,
  }).catch(() => {});
}
