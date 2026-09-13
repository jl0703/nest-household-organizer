import { backendFetch } from "@/lib/api/backend";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return backendFetch(`/invitations/${token}/accept`, { method: "POST" });
}
