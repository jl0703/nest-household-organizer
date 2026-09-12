import { backendFetch } from "@/lib/api/backend";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; childId: string }> },
) {
  const { householdId, childId } = await params;
  return backendFetch(`/households/${householdId}/children/${childId}`, {
    method: "DELETE",
  });
}
