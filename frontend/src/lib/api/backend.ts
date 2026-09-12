import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {}
export class BackendApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
  }
}

/** Resolves the current Supabase access token, or throws UnauthorizedError. */
export async function requireAccessToken(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new UnauthorizedError();
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new UnauthorizedError();
  }

  return session.access_token;
}

type BackendRequestInit = Omit<RequestInit, "body"> & { body?: unknown };

/**
 * Calls the Micronaut backend as the authenticated user and relays the raw
 * response as a Next.js Route Handler response, so BFF proxy routes stay
 * thin pass-throughs. Returns 401 when there is no valid Supabase session
 * and 500/502 for server-side misconfiguration or connectivity failures.
 */
export async function backendFetch(
  path: string,
  init: BackendRequestInit = {},
): Promise<NextResponse> {
  let token: string;
  try {
    token = await requireAccessToken();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_API_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { error: "Server misconfigured: BACKEND_API_URL is not set" },
      { status: 500 },
    );
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }

  let response: Response;
  try {
    response = await fetch(`${backendUrl}${path}`, { ...init, headers, body });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the household service" },
      { status: 502 },
    );
  }

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const text = await response.text();
  const contentType = response.headers.get("Content-Type") ?? "application/json";
  return new NextResponse(text.length > 0 ? text : null, {
    status: response.status,
    headers: { "Content-Type": contentType },
  });
}

/**
 * Calls the Micronaut backend directly and returns parsed JSON, for use in
 * Server Components that need data server-side (avoids an extra HTTP hop
 * through this app's own BFF routes). Throws UnauthorizedError or
 * BackendApiError on failure so callers can render the right UI state.
 */
export async function backendJson<T>(path: string, init: BackendRequestInit = {}): Promise<T> {
  const token = await requireAccessToken();
  const backendUrl = process.env.BACKEND_API_URL;
  if (!backendUrl) {
    throw new BackendApiError("BACKEND_API_URL is not set", 500, null);
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    let parsedBody: unknown = null;
    try {
      parsedBody = await response.json();
    } catch {
      // Response had no JSON body; leave parsedBody as null.
    }
    throw new BackendApiError(`Backend request failed (${response.status})`, response.status, parsedBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
