// POST {text, voice} -> saves the text to R2 as stories/<date>-<ref>-<voice>.txt
// Text is small, so it goes through the function directly (no presigned URL).

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, guard, json, notify, newKey, BUCKET } from "../lib/r2.mjs";

const MAX_CHARS = 4000;                 // must match maxlength in public/index.html
const VOICES = ["female", "male"];

export default async (req) => {
  const blocked = guard(req);
  if (blocked) return blocked;

  const { text = "", voice = "" } = await req.json().catch(() => ({}));

  if (typeof text !== "string" || !text.trim() || text.length > MAX_CHARS) {
    return json({ error: "Text is empty or too long." }, 400);
  }
  if (!VOICES.includes(voice)) {
    return json({ error: "Unknown voice." }, 400);
  }

  const key = `${newKey()}-${voice}.txt`;
  try {
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: text,
      ContentType: "text/plain; charset=utf-8",
    }));
  } catch (err) {
    console.error("save failed", err);
    return json({ error: "Could not save the text." }, 500);
  }

  console.log("text saved", { key, chars: text.length, voice });
  await notify(`Text (${voice}): ${key}`);
  return json({ ok: true, key });
};
