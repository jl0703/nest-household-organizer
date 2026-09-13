import { backendFetch } from "@/lib/api/backend";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; occurrenceId: string }> },
) {
  const { householdId, occurrenceId } = await params;
  return backendFetch(`/households/${householdId}/chores/occurrences/${occurrenceId}/complete`, {
    method: "POST",
  });
}
