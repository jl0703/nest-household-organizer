import { backendFetch } from "@/lib/api/backend";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; targetUserId: string }> },
) {
  const { householdId, targetUserId } = await params;
  return backendFetch(`/households/${householdId}/members/${targetUserId}`, {
    method: "DELETE",
  });
}
