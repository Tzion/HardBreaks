// POST {name, type, size} -> {url, key}
// Returns a presigned PUT URL so the browser uploads the recording straight to R2.
// Usually an MP3 made in the browser; the original file when the browser couldn't convert it.
// The file never passes through here: Netlify caps function payloads at 6 MB.

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, guard, json, newKey, BUCKET, MAX_MB } from "../lib/r2.mjs";

const URL_TTL = 900; // seconds

// Phones label audio inconsistently (m4a can come as video/mp4, some files have no type)
const allowedType = (type) =>
  type.startsWith("audio/") || type.startsWith("video/") || type === "application/octet-stream";

// "Memo 12 (final).m4a" -> "Memo-12-final": letters (any language), digits, - and _ only
const baseOf = (name) =>
  name.replace(/\.[^.]*$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const extensionOf = (name) =>
  (name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";

export default async (req) => {
  const blocked = guard(req);
  if (blocked) return blocked;

  const { name = "", type = "", size = 0 } = await req.json().catch(() => ({}));

  if (!allowedType(type)) {
    console.error("sign refused: type", { name, type, size });
    return json({ error: "Audio files only." }, 400);
  }
  if (!Number.isInteger(size) || size <= 0 || size > MAX_MB * 1024 * 1024) {
    console.error("sign refused: size", { name, type, size });
    return json({ error: `File is too large. The limit is ${MAX_MB} MB.` }, 400);
  }

  // stories/<date>-<ref>-<original name>.<ext>
  const base = baseOf(name);
  const key = `${newKey()}${base ? `-${base}` : ""}.${extensionOf(name)}`;

  // ContentLength and ContentType are part of the signature, so the URL
  // can't be reused for a different or bigger file.
  try {
    const url = await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: type, ContentLength: size }),
      { expiresIn: URL_TTL }
    );
    console.log("upload signed", { key, name, type, size });
    return json({ url, key });
  } catch (err) {
    console.error("sign failed", { name, type, size }, err);
    return json({ error: "Could not start the upload." }, 500);
  }
};
