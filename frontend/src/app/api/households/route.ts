import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET() {
  return backendFetch("/households");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return backendFetch("/households", { method: "POST", body });
}
