import { env } from "cloudflare:workers";

export type StoredPhoto = {
  id: string;
  title: string;
  category: string;
  note: string;
  date: string;
  imageKey: string;
  contentType: string;
  createdAt: string;
};

const ADMIN_CODE = "ALBUM2026";

const createPhotosTable = `
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  image_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  created_at TEXT NOT NULL
)
`;

const createPhotosCategoryIndex =
  "CREATE INDEX IF NOT EXISTS photos_category_idx ON photos (category)";

const createPhotosCreatedIndex =
  "CREATE INDEX IF NOT EXISTS photos_created_idx ON photos (created_at)";

export type PhotoResponse = {
  id: string;
  title: string;
  category: string;
  note: string;
  date: string;
  src: string;
  createdAt: string;
};

export function assertAdminCode(value: FormDataEntryValue | string | null) {
  if (String(value ?? "").trim().toUpperCase() !== ADMIN_CODE) {
    return Response.json({ error: "Неверный пароль администратора." }, { status: 401 });
  }

  return null;
}

export function getBindings() {
  if (!env.DB || !env.ALBUM_BUCKET) {
    throw new Error("Storage bindings are unavailable.");
  }

  return {
    db: env.DB,
    bucket: env.ALBUM_BUCKET,
  };
}

export async function ensurePhotosSchema(db: D1Database) {
  await db.batch([
    db.prepare(createPhotosTable),
    db.prepare(createPhotosCategoryIndex),
    db.prepare(createPhotosCreatedIndex),
  ]);
}

export function photoToResponse(photo: StoredPhoto): PhotoResponse {
  return {
    id: photo.id,
    title: photo.title,
    category: photo.category,
    note: photo.note,
    date: photo.date,
    src: `/api/photos/${photo.id}/image`,
    createdAt: photo.createdAt,
  };
}

export function toStoredPhoto(row: Record<string, unknown>): StoredPhoto {
  return {
    id: String(row.id),
    title: String(row.title),
    category: String(row.category),
    note: String(row.note ?? ""),
    date: String(row.date ?? ""),
    imageKey: String(row.image_key),
    contentType: String(row.content_type),
    createdAt: String(row.created_at),
  };
}
