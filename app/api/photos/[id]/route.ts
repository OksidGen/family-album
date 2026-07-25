import { assertAdminCode, ensurePhotosSchema, getBindings, toStoredPhoto } from "../storage";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as {
      adminCode?: string;
    };
    const unauthorized = assertAdminCode(payload.adminCode ?? null);
    if (unauthorized) {
      return unauthorized;
    }

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
      return Response.json({ error: "Фотография не найдена." }, { status: 404 });
    }

    const photo = toStoredPhoto(row);
    await bucket.delete(photo.imageKey);
    await db.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
