import { backendFetch } from "@/lib/api/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; eventId: string }> },
) {
  const { householdId, eventId } = await params;
  return backendFetch(`/households/${householdId}/events/${eventId}/occurrences`);
}
