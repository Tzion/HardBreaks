# HardBreaks one-pager

Static page plus three small Netlify functions. Stories are stored in Cloudflare R2.

```
public/             what gets published: index.html, style.css, script.js, assets/, vendor/
netlify/functions/  sign-upload, notify, submit-text
netlify/lib/r2.mjs  shared R2 client, limits, ntfy helper
```

- Media in `public/assets/`: `cover.mp4` (background video) and `image.jpg`.
- Preview the page only: `npx serve public` (sending won't work without the functions).
- Deploy: `npm install`, then `netlify deploy --prod` (from this folder).

## How sending works

- **Text**: the browser posts `{text, voice}` to `/api/submit-text`, which saves `stories/<date>-<ref>-<voice>.txt`.
- **Recording**: the browser converts it to MP3 (mono 64 kbps, ~3.8 MB per 8 min; recordings up to 8 min). If the browser can't decode the format, the original file is sent as is.
  1. It asks `/api/sign-upload` for a presigned URL (audio/video/unknown types, 400 MB max).
  2. It uploads straight to R2 as `stories/<date>-<ref>-<original name>.mp3` (or the original extension).
  3. It calls `/api/notify`.
- Each new story pushes a notification to your phone via ntfy (if `NTFY_TOPIC` is set).
- **Recordings are uploaded as files.** iPhone Voice Memos don't show up in the file picker until they're saved: memo → ⋯ → Save to Files. The page shows this hint.

## Where to find the stories

Cloudflare dashboard → **R2** → your bucket (e.g. `hardbreaks-stories`) → folder **`stories/`**.

- Recordings: `<date>-<ref>-<original name>.mp3`, or `.m4a`/other when sent unconverted
- Texts: `<date>-<ref>-<female|male>.txt` (the voice choice is in the name)

Click a file → **Download**. The bucket is private, so files are only reachable from your Cloudflare account.

## Logs

Netlify dashboard → **hardbreaks** → **Logs** → **Functions**:

- `log`: events from people's browsers. `file-picked`, `send-ok`, `send-failed` (with the error), and `convert-failed` (the browser couldn't decode the file, so the original was sent), each with the file name, type and size, plus the browser.
- `sign-upload`, `notify`, `submit-text`: server side. `upload signed`, `recording landed`, `text saved`, plus any refusals and errors.

## Setup

### 1. Cloudflare R2

> **The R2 API token expires on Nov somedate, 2026.** Create a new one before then and update the Netlify env vars.

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `hardbreaks-stories`). Keep it private.
2. **Manage R2 API Tokens** → create a token with **Object Read & Write**, scoped to that bucket. Set its expiry to Dec 31, 2026. Save the Access Key ID and Secret.
3. Copy your **Account ID** from the R2 overview page.
4. Bucket → **Settings** → **CORS policy**:

```json
[
  {
    "AllowedOrigins": ["https://hardbreaks.netlify.app"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

### 2. ntfy (optional)

Install the [ntfy](https://ntfy.sh) app and subscribe to a hard-to-guess topic (e.g. `hardbreaks-stories-x7q2`). Topics are public to anyone who knows the name.

### 3. Netlify env vars

Project configuration → **Environment variables**:

| Key | Value |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 token key ID |
| `R2_SECRET_ACCESS_KEY` | R2 token secret |
| `R2_BUCKET` | bucket name |
| `NTFY_TOPIC` | your secret topic name (optional) |
