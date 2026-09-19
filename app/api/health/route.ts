export async function GET() {
  return Response.json({ status: "ok", service: "sk-builder", timestamp: new Date().toISOString() });
}
