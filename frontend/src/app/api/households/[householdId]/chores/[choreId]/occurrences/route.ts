import { backendFetch } from "@/lib/api/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; choreId: string }> },
) {
  const { householdId, choreId } = await params;
  return backendFetch(`/households/${householdId}/chores/${choreId}/occurrences`);
}
