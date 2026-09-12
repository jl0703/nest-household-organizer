import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ householdId: string }> },
) {
  const { householdId } = await params;
  return backendFetch(`/households/${householdId}/children`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string }> },
) {
  const { householdId } = await params;
  const body = await request.json();
  return backendFetch(`/households/${householdId}/children`, { method: "POST", body });
}
