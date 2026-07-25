import { createFamilyAccessResponse } from "../photos/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    accessCode?: string;
  };

  return createFamilyAccessResponse(payload.accessCode ?? null);
}
