import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredFolder = {
  id: string;
  name: string;
  createdAt: string;
};

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

export type AlbumSettings = {
  coverPhotoId: string | null;
  coverPositionX: number;
  coverPositionY: number;
};

export type PhotoResponse = {
  id: string;
  title: string;
  category: string;
  note: string;
  date: string;
  src: string;
  createdAt: string;
};

export type FolderResponse = StoredFolder;

const DEFAULT_ADMIN_CODE = "ALBUM2026";
const DEFAULT_FAMILY_CODE = "LOVE2026";
const FAMILY_ACCESS_COOKIE = "family_album_access";
const DEFAULT_DATA_DIR = path.join(process.cwd(), ".family-album-data");
const DEFAULT_FOLDERS = [
  "Наша история",
  "Путешествия",
  "Дом",
  "Праздники",
  "Любимые моменты",
];

function dataDir() {
  return process.env.FAMILY_ALBUM_DATA_DIR || DEFAULT_DATA_DIR;
}

function indexPath() {
  return path.join(dataDir(), "photos.json");
}

function foldersPath() {
  return path.join(dataDir(), "folders.json");
}

function settingsPath() {
  return path.join(dataDir(), "settings.json");
}

export function uploadsDir() {
  return path.join(dataDir(), "uploads");
}

function adminCode() {
  return process.env.ADMIN_CODE || DEFAULT_ADMIN_CODE;
}

function familyCode() {
  return process.env.FAMILY_CODE || DEFAULT_FAMILY_CODE;
}

function isAdminCode(value: FormDataEntryValue | string | null) {
  return String(value ?? "").trim() === adminCode();
}

export async function ensureStorage() {
  await mkdir(uploadsDir(), { recursive: true });
}

export function assertAdminCode(value: FormDataEntryValue | string | null) {
  if (!isAdminCode(value)) {
    return Response.json({ error: "Неверный пароль администратора." }, { status: 401 });
  }

  return null;
}

export function assertFamilyAccess(request: Request) {
  const cookie = request.headers.get("Cookie") ?? "";
  if (cookie.split(";").some((item) => item.trim() === `${FAMILY_ACCESS_COOKIE}=granted`)) {
    return null;
  }

  return Response.json({ error: "Нужен семейный код." }, { status: 401 });
}

export function assertFamilyOrAdminAccess(request: Request) {
  const familyUnauthorized = assertFamilyAccess(request);
  if (!familyUnauthorized) {
    return null;
  }

  if (isAdminCode(request.headers.get("x-admin-code"))) {
    return null;
  }

  return familyUnauthorized;
}

export function createFamilyAccessResponse(value: string | null) {
  if (String(value ?? "").trim() !== familyCode()) {
    return Response.json({ error: "Проверьте семейный код и попробуйте еще раз." }, { status: 401 });
  }

  const shouldUseSecureCookie =
    process.env.COOKIE_SECURE?.toLowerCase() !== "false" && process.env.NODE_ENV === "production";
  const secureCookie = shouldUseSecureCookie ? " Secure;" : "";

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${FAMILY_ACCESS_COOKIE}=granted; HttpOnly;${secureCookie} SameSite=Lax; Path=/; Max-Age=2592000`,
      },
    }
  );
}

function normalizeFolderName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizePercent(value: unknown, fallback = 50) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;
}

function defaultFolders(): StoredFolder[] {
  const now = new Date().toISOString();
  return DEFAULT_FOLDERS.map((name, index) => ({
    id: `default-${index + 1}`,
    name,
    createdAt: now,
  }));
}

async function readJsonFile<T>(filePath: string, fallback: T) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function readOptionalJsonFile<T>(filePath: string) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readPhotos() {
  await ensureStorage();

  const photos = await readJsonFile<StoredPhoto[]>(indexPath(), []);
  return Array.isArray(photos) ? photos : [];
}

async function writeJsonFile<T>(filePath: string, value: T) {
  await ensureStorage();

  const temporary = `${filePath}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
  await rename(temporary, filePath);
}

export async function writePhotos(photos: StoredPhoto[]) {
  await writeJsonFile(indexPath(), photos);
}

export async function readAlbumSettings(): Promise<AlbumSettings> {
  await ensureStorage();

  const settings = await readJsonFile<Partial<AlbumSettings>>(settingsPath(), {});
  return {
    coverPhotoId: typeof settings.coverPhotoId === "string" ? settings.coverPhotoId : null,
    coverPositionX: normalizePercent(settings.coverPositionX),
    coverPositionY: normalizePercent(settings.coverPositionY),
  };
}

export async function writeAlbumSettings(settings: AlbumSettings) {
  await writeJsonFile(settingsPath(), settings);
}

export async function readFolders() {
  await ensureStorage();

  const savedFolders = await readOptionalJsonFile<StoredFolder[]>(foldersPath());
  const photos = await readPhotos();
  const names = new Map<string, StoredFolder>();
  const baseFolders = savedFolders === null ? defaultFolders() : savedFolders;

  for (const folder of Array.isArray(baseFolders) ? baseFolders : []) {
    const name = normalizeFolderName(folder.name);
    if (name && !names.has(name.toLowerCase())) {
      names.set(name.toLowerCase(), { ...folder, name });
    }
  }

  for (const photo of photos) {
    const name = normalizeFolderName(photo.category);
    if (name && !names.has(name.toLowerCase())) {
      names.set(name.toLowerCase(), {
        id: crypto.randomUUID(),
        name,
        createdAt: photo.createdAt,
      });
    }
  }

  return Array.from(names.values());
}

export async function writeFolders(folders: StoredFolder[]) {
  await writeJsonFile(foldersPath(), folders);
}

export async function addFolder(name: string) {
  const normalizedName = normalizeFolderName(name);
  if (!normalizedName) {
    throw new Error("Название папки обязательно.");
  }

  const folders = await readFolders();
  const existing = folders.find((folder) => folder.name.toLowerCase() === normalizedName.toLowerCase());
  if (existing) {
    return existing;
  }

  const folder = {
    id: crypto.randomUUID(),
    name: normalizedName,
    createdAt: new Date().toISOString(),
  };
  await writeFolders([...folders, folder]);
  return folder;
}

export async function addStoredPhoto(photo: StoredPhoto) {
  const photos = await readPhotos();
  await writePhotos([photo, ...photos]);
}

export async function findStoredPhoto(id: string) {
  const photos = await readPhotos();
  return photos.find((photo) => photo.id === id) ?? null;
}

export async function setCoverPhoto(id: string, coverPositionX?: number, coverPositionY?: number) {
  const photo = await findStoredPhoto(id);
  if (!photo) {
    throw new Error("Фотография не найдена.");
  }

  const currentSettings = await readAlbumSettings();
  const settings = {
    coverPhotoId: photo.id,
    coverPositionX: normalizePercent(
      coverPositionX,
      currentSettings.coverPhotoId === photo.id ? currentSettings.coverPositionX : 50
    ),
    coverPositionY: normalizePercent(
      coverPositionY,
      currentSettings.coverPhotoId === photo.id ? currentSettings.coverPositionY : 50
    ),
  };
  await writeAlbumSettings(settings);
  return settings;
}

async function clearCoverIfNeeded(deletedPhotoIds: string[]) {
  if (deletedPhotoIds.length === 0) {
    return;
  }

  const settings = await readAlbumSettings();
  if (settings.coverPhotoId && deletedPhotoIds.includes(settings.coverPhotoId)) {
    await writeAlbumSettings({ coverPhotoId: null, coverPositionX: 50, coverPositionY: 50 });
  }
}

export async function deleteStoredPhoto(id: string) {
  const photos = await readPhotos();
  const photo = photos.find((item) => item.id === id);

  if (!photo) {
    return null;
  }

  await writePhotos(photos.filter((item) => item.id !== id));
  await clearCoverIfNeeded([id]);

  try {
    await unlink(path.join(uploadsDir(), photo.imageKey));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }

  return photo;
}

export async function deleteFolder(id: string) {
  const folders = await readFolders();
  const folder = folders.find((item) => item.id === id);

  if (!folder) {
    return null;
  }

  const photos = await readPhotos();
  const photosToDelete = photos.filter((photo) => photo.category === folder.name);
  const remainingPhotos = photos.filter((photo) => photo.category !== folder.name);
  const remainingFolders = folders.filter((item) => item.id !== id);

  await writePhotos(remainingPhotos);
  await writeFolders(remainingFolders);
  await clearCoverIfNeeded(photosToDelete.map((photo) => photo.id));

  await Promise.all(
    photosToDelete.map(async (photo) => {
      try {
        await unlink(path.join(uploadsDir(), photo.imageKey));
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
          throw error;
        }
      }
    })
  );

  return {
    folder,
    deletedPhotos: photosToDelete.length,
  };
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

export function extensionForContentType(contentType: string) {
  if (contentType === "image/jpeg") {
    return ".jpg";
  }
  if (contentType === "image/png") {
    return ".png";
  }
  if (contentType === "image/webp") {
    return ".webp";
  }
  if (contentType === "image/gif") {
    return ".gif";
  }
  return ".img";
}
