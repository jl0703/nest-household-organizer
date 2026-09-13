import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; eventId: string; date: string }> },
) {
  const { householdId, eventId, date } = await params;
  const body = await request.json();
  return backendFetch(`/households/${householdId}/events/${eventId}/occurrences/${date}/modify`, {
    method: "POST",
    body,
  });
}
