import {
  assertAdminCode,
  assertFamilyOrAdminAccess,
  addStoredPhoto,
  ensureStorage,
  extensionForContentType,
  photoToResponse,
  readFolders,
  readPhotos,
  uploadsDir,
} from "./storage";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function cleanText(value: FormDataEntryValue | null, fallback = "") {
  return String(value ?? fallback).trim();
}

export async function GET(request: Request) {
  try {
    const unauthorized = assertFamilyOrAdminAccess(request);
    if (unauthorized) {
      return unauthorized;
    }

    const [photos, folders] = await Promise.all([readPhotos(), readFolders()]);

    return Response.json({
      photos: photos.map(photoToResponse),
      folders,
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
      return Response.json({ error: "Файл должен быть не больше 25 МБ." }, { status: 400 });
    }

    await ensureStorage();

    const id = crypto.randomUUID();
    const title = cleanText(formData.get("title"), file.name.replace(/\.[^/.]+$/, ""));
    const folders = await readFolders();
    const category = cleanText(formData.get("category"), folders[0]?.name ?? "Любимые моменты");
    const note = cleanText(formData.get("note"));
    const date = cleanText(formData.get("date"));
    const contentType = file.type || "application/octet-stream";
    const imageKey = `${id}${extensionForContentType(contentType)}`;
    const createdAt = new Date().toISOString();

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir(), imageKey), bytes);

    await addStoredPhoto({
      id,
      title,
      category,
      note,
      date,
      imageKey,
      contentType,
      createdAt,
    });

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
