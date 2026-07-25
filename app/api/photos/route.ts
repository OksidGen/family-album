import {
  assertAdminCode,
  ensurePhotosSchema,
  getBindings,
  photoToResponse,
  toStoredPhoto,
} from "./storage";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function cleanText(value: FormDataEntryValue | null, fallback = "") {
  return String(value ?? fallback).trim();
}

export async function GET() {
  try {
    const { db } = getBindings();
    await ensurePhotosSchema(db);

    const result = await db
      .prepare(
        `SELECT id, title, category, note, date, image_key, content_type, created_at
         FROM photos
         ORDER BY created_at DESC`
      )
      .all<Record<string, unknown>>();

    return Response.json({
      photos: (result.results ?? []).map((row) => photoToResponse(toStoredPhoto(row))),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const unauthorized = assertAdminCode(formData.get("adminCode"));
    if (unauthorized) {
      return unauthorized;
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Выберите фотографию." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Можно загружать только изображения." }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: "Файл должен быть не больше 10 МБ." }, { status: 400 });
    }

    const { db, bucket } = getBindings();
    await ensurePhotosSchema(db);

    const id = crypto.randomUUID();
    const title = cleanText(formData.get("title"), file.name.replace(/\.[^/.]+$/, ""));
    const category = cleanText(formData.get("category"), "Любимые моменты");
    const note = cleanText(formData.get("note"));
    const date = cleanText(formData.get("date"));
    const contentType = file.type || "application/octet-stream";
    const imageKey = `photos/${id}`;
    const createdAt = new Date().toISOString();

    await bucket.put(imageKey, file.stream(), {
      httpMetadata: {
        contentType,
      },
    });

    await db
      .prepare(
        `INSERT INTO photos
          (id, title, category, note, date, image_key, content_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, title, category, note, date, imageKey, contentType, createdAt)
      .run();

    return Response.json(
      {
        photo: {
          id,
          title,
          category,
          note,
          date,
          src: `/api/photos/${id}/image`,
          createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
