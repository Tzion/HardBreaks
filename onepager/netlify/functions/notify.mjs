// POST {key} -> pushes "a recording landed" to ntfy.

import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { r2, guard, json, notify, BUCKET, KEY_PREFIX } from "../lib/r2.mjs";

export default async (req) => {
  const blocked = guard(req);
  if (blocked) return blocked;

  const { key = "" } = await req.json().catch(() => ({}));
  if (!key.startsWith(KEY_PREFIX)) return new Response("Bad request", { status: 400 });

  // Only notify for objects that actually landed, so this can't be used to spam your phone
  let object;
  try {
    object = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    console.error("notify: object not found", { key });
    return new Response("Not found", { status: 404 });
  }

  console.log("recording landed", { key, size: object.ContentLength, type: object.ContentType });
  await notify(`Recording: ${key}`);
  return json({ ok: true });
};
