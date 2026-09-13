import { backendFetch } from "@/lib/api/backend";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; eventId: string; date: string }> },
) {
  const { householdId, eventId, date } = await params;
  return backendFetch(`/households/${householdId}/events/${eventId}/occurrences/${date}/skip`, {
    method: "POST",
  });
}
