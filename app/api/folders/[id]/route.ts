import { assertAdminCode, deleteFolder } from "../../photos/storage";

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

    const result = await deleteFolder(id);
    if (!result) {
      return Response.json({ error: "Папка не найдена." }, { status: 404 });
    }

    return Response.json({ ok: true, deletedPhotos: result.deletedPhotos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
