import { assertAdminCode } from "../photos/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    adminCode?: string;
  };
  const unauthorized = assertAdminCode(payload.adminCode ?? null);

  if (unauthorized) {
    return unauthorized;
  }

  return Response.json({ ok: true });
}
