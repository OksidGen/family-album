import { ensurePhotosSchema, getBindings, toStoredPhoto } from "../../storage";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, bucket } = getBindings();
    await ensurePhotosSchema(db);

    const row = await db
      .prepare(
        `SELECT id, title, category, note, date, image_key, content_type, created_at
         FROM photos
         WHERE id = ?`
      )
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) {
      return new Response("Not found", { status: 404 });
    }

    const photo = toStoredPhoto(row);
    const object = await bucket.get(photo.imageKey);
    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(object.body, {
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
