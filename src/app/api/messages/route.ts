import { handleFormPost } from "@/lib/forms/api-handler";

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  return handleFormPost("messages", payload);
}
