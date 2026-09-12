import { backendFetch } from "@/lib/api/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ householdId: string }> },
) {
  const { householdId } = await params;
  return backendFetch(`/households/${householdId}`);
}
