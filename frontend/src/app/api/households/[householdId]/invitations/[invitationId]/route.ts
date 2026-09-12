import { backendFetch } from "@/lib/api/backend";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; invitationId: string }> },
) {
  const { householdId, invitationId } = await params;
  return backendFetch(`/households/${householdId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}
