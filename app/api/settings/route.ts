import { assertAdminCode, setCoverPhoto } from "../photos/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      adminCode?: string;
      coverPhotoId?: string;
      coverPositionX?: number;
      coverPositionY?: number;
    };
    const unauthorized = assertAdminCode(payload.adminCode ?? null);
    if (unauthorized) {
      return unauthorized;
    }

    if (!payload.coverPhotoId) {
      return Response.json({ error: "Выберите фотографию для обложки." }, { status: 400 });
    }

    const settings = await setCoverPhoto(payload.coverPhotoId, payload.coverPositionX, payload.coverPositionY);
    return Response.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 400 });
  }
}
