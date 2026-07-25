import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertFamilyAccess, findStoredPhoto, uploadsDir } from "../../storage";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const unauthorized = assertFamilyAccess(request);
    if (unauthorized) {
      return unauthorized;
    }

    const { id } = await context.params;
    const photo = await findStoredPhoto(id);
    if (!photo) {
      return new Response("Not found", { status: 404 });
    }

    const bytes = await readFile(path.join(uploadsDir(), photo.imageKey));

    return new Response(bytes, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": photo.contentType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
