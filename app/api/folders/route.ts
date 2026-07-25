import { addFolder, assertAdminCode, assertFamilyOrAdminAccess, readFolders } from "../photos/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const unauthorized = assertFamilyOrAdminAccess(request);
    if (unauthorized) {
      return unauthorized;
    }

    return Response.json({ folders: await readFolders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      adminCode?: string;
      name?: string;
    };
    const unauthorized = assertAdminCode(payload.adminCode ?? null);
    if (unauthorized) {
      return unauthorized;
    }

    const folder = await addFolder(payload.name ?? "");
    return Response.json({ folder }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 400 });
  }
}
