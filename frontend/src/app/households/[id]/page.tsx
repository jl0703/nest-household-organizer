import { notFound, redirect } from "next/navigation";
import { BackendApiError, UnauthorizedError, backendJson } from "@/lib/api/backend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ChildProfile, Household, HouseholdMember } from "@/lib/types";
import { HouseholdDashboard } from "./household-dashboard";

export default async function HouseholdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const returnTo = `/households/${id}`;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
  }

  let household: Household;
  let members: HouseholdMember[];
  let children: ChildProfile[];

  try {
    [household, members, children] = await Promise.all([
      backendJson<Household>(`/households/${id}`),
      backendJson<HouseholdMember[]>(`/households/${id}/members`),
      backendJson<ChildProfile[]>(`/households/${id}/children`),
    ]);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
    }
    if (err instanceof BackendApiError && err.status === 404) {
      notFound();
    }
    return (
      <main className="household-shell">
        <p className="status-banner error" role="alert">
          We couldn&apos;t load this household right now. Please refresh the page, or you may not
          have access to it.
        </p>
      </main>
    );
  }

  return (
    <HouseholdDashboard
      household={household}
      initialMembers={members}
      initialChildren={children}
      currentUserId={user.id}
    />
  );
}
