import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; eventId: string }> },
) {
  const { householdId, eventId } = await params;
  return backendFetch(`/households/${householdId}/events/${eventId}`);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; eventId: string }> },
) {
  const { householdId, eventId } = await params;
  const body = await request.json();
  return backendFetch(`/households/${householdId}/events/${eventId}`, { method: "PUT", body });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; eventId: string }> },
) {
  const { householdId, eventId } = await params;
  return backendFetch(`/households/${householdId}/events/${eventId}`, { method: "DELETE" });
}
