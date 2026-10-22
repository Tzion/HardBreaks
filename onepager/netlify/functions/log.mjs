// POST {event, ...details} -> writes a client-side event to the Netlify function logs.
// Lets you see upload successes and failures (with file details) from people's phones.

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = (await req.text()).slice(0, 4000); // cap, so this can't flood the logs
  let entry;
  try {
    entry = JSON.parse(body);
  } catch {
    entry = { raw: body };
  }

  const failed = String(entry.event || "").endsWith("failed");
  (failed ? console.error : console.log)("client", entry);
  return new Response(null, { status: 204 });
};
