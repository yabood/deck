export function statusPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #eee; height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center; text-align: center; }
  .box { max-width: 420px; padding: 32px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  p { color: #999; font-size: 15px; line-height: 1.5; margin: 0; }
</style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
