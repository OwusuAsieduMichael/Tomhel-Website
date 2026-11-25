import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/prep/auth/current-user";
import { FILE_ID, getStore, PICTURE_TYPES, type StoredFile } from "@/lib/prep/store";

/**
 * Question pictures (maths equations, diagrams). They are licensed content, so only signed-in users get
 * them; they are fetched from the portal's private Drive folder through the Apps Script.
 *
 * A picture id never changes content, so browsers keep it (private cache, one year) and the server keeps
 * recent ones in memory: a class opening the same paper fetches each picture from Google once.
 */
const MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;
const memory = new Map<string, StoredFile>();
let memoryBytes = 0;

function remember(id: string, file: StoredFile) {
  memory.set(id, file);
  memoryBytes += file.data.length;
  for (const [oldId, old] of memory) {
    if (memoryBytes <= MEMORY_LIMIT_BYTES) break;
    memory.delete(oldId);
    memoryBytes -= old.data.length;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in to see this picture.", { status: 401 });

  const { id } = await params;
  if (!FILE_ID.test(id)) return new NextResponse("Not found", { status: 404 });

  let file = memory.get(id) ?? null;
  if (file) {
    // Most recently used last, so the oldest is dropped first.
    memory.delete(id);
    memory.set(id, file);
  } else {
    file = await getStore().getFile(id);
    if (!file || !PICTURE_TYPES.includes(file.mimeType)) return new NextResponse("Not found", { status: 404 });
    remember(id, file);
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
