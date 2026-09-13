"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type {
  CalendarEvent,
  ChildProfile,
  Chore,
  Household,
  HouseholdMember,
  Invitation,
  ShoppingList,
} from "@/lib/types";
import { CalendarPanel } from "./calendar-panel";
import { ChoresPanel } from "./chores-panel";
import { ShoppingListsPanel } from "./shopping-lists-panel";

interface HouseholdDashboardProps {
  household: Household;
  initialMembers: HouseholdMember[];
  initialChildren: ChildProfile[];
  initialEvents: CalendarEvent[];
  initialChores: Chore[];
  initialShoppingLists: ShoppingList[];
  currentUserId: string;
}

function memberLabel(member: HouseholdMember, currentUserId: string) {
  const short = member.userId.slice(0, 8);
  return member.userId === currentUserId ? `You (${short})` : `Member ${short}`;
}

export function HouseholdDashboard({
  household,
  initialMembers,
  initialChildren,
  initialEvents,
  initialChores,
  initialShoppingLists,
  currentUserId,
}: HouseholdDashboardProps) {
  const router = useRouter();
  const isOwner = household.ownerId === currentUserId;

  const [members, setMembers] = useState<HouseholdMember[]>(initialMembers);
  const [children, setChildren] = useState<ChildProfile[]>(initialChildren);
  // Invitations sent this session. The backend does not expose a "list
  // pending invitations" endpoint, so this list reflects invites created
  // since this page was loaded rather than full server-persisted state.
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);

  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferStatus, setTransferStatus] = useState<"idle" | "submitting">("idle");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "submitting">("idle");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [childName, setChildName] = useState("");
  const [childStatus, setChildStatus] = useState<"idle" | "submitting">("idle");
  const [childError, setChildError] = useState<string | null>(null);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError("Enter an email address to invite.");
      return;
    }

    setInviteError(null);
    setInviteSuccess(null);
    setInviteStatus("submitting");

    try {
      const response = await fetch(`/api/households/${household.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: email }),
      });

      if (!response.ok) {
        const message =
          response.status === 401
            ? "Your session has expired. Please sign in again."
            : response.status === 403
              ? "Only the household owner can send invitations."
              : "We couldn't send that invitation. Please try again.";
        setInviteError(message);
        return;
      }

      const invitation = (await response.json()) as Invitation;
      setInvitations((current) => [invitation, ...current]);
      setInviteSuccess(`Invitation sent to ${invitation.recipientEmail}.`);
      setInviteEmail("");
    } catch {
      setInviteError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setInviteStatus("idle");
    }
  }

  async function handleRevoke(invitation: Invitation) {
    setRevokingId(invitation.id);
    try {
      const response = await fetch(
        `/api/households/${household.id}/invitations/${invitation.id}`,
        { method: "DELETE" },
      );
      if (response.ok || response.status === 204) {
        setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      }
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRemoveMember(member: HouseholdMember) {
    setRemoveMemberError(null);
    setRemovingMemberId(member.id);
    try {
      const response = await fetch(
        `/api/households/${household.id}/members/${member.userId}`,
        { method: "DELETE" },
      );
      if (response.ok || response.status === 204) {
        setMembers((current) => current.filter((item) => item.id !== member.id));
        return;
      }
      setRemoveMemberError(
        response.status === 403
          ? "Only the household owner can remove members."
          : "We couldn't remove that member. Please try again.",
      );
    } catch {
      setRemoveMemberError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleTransferOwnership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transferTargetId) {
      setTransferError("Choose a member to become the new owner.");
      return;
    }

    setTransferError(null);
    setTransferSuccess(null);
    setTransferStatus("submitting");

    try {
      const response = await fetch(`/api/households/${household.id}/transfer-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId: transferTargetId }),
      });

      if (!response.ok) {
        setTransferError("We couldn't transfer ownership. Please try again.");
        return;
      }

      setTransferSuccess("Ownership transferred.");
      setTransferTargetId("");
      router.refresh();
    } catch {
      setTransferError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setTransferStatus("idle");
    }
  }

  async function handleAddChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = childName.trim();
    if (!displayName) {
      setChildError("Enter a display name for the child profile.");
      return;
    }

    setChildError(null);
    setChildStatus("submitting");

    try {
      const response = await fetch(`/api/households/${household.id}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      if (!response.ok) {
        setChildError("We couldn't add that child profile. Please try again.");
        return;
      }

      const child = (await response.json()) as ChildProfile;
      setChildren((current) => [...current, child]);
      setChildName("");
    } catch {
      setChildError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setChildStatus("idle");
    }
  }

  async function handleDeleteChild(child: ChildProfile) {
    setDeletingChildId(child.id);
    try {
      const response = await fetch(`/api/households/${household.id}/children/${child.id}`, {
        method: "DELETE",
      });
      if (response.ok || response.status === 204) {
        setChildren((current) => current.filter((item) => item.id !== child.id));
      }
    } finally {
      setDeletingChildId(null);
    }
  }

  return (
    <main className="household-shell">
      <header className="household-header">
        <p className="eyebrow">{isOwner ? "YOU OWN THIS HOUSEHOLD" : "YOU ARE A MEMBER"}</p>
        <h1>{household.name}</h1>
        <p className="household-meta">Timezone: {household.timezone}</p>
      </header>

      <div className="household-grid">
        <section className="panel" aria-labelledby="members-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">WHO IS HERE</p>
              <h2 id="members-heading">Members</h2>
            </div>
            <span className="count">{members.length}</span>
          </div>

          {removeMemberError && (
            <p className="status-banner error" role="alert">
              {removeMemberError}
            </p>
          )}

          {members.length === 0 ? (
            <p className="empty-state">No members yet.</p>
          ) : (
            <ul className="member-list">
              {members.map((member) => (
                <li key={member.id}>
                  <span>{memberLabel(member, currentUserId)}</span>
                  <span className={`role-badge ${member.role}`}>{member.role}</span>
                  {isOwner && member.userId !== currentUserId && (
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => handleRemoveMember(member)}
                      disabled={removingMemberId === member.id}
                      aria-label={`Remove ${memberLabel(member, currentUserId)}`}
                    >
                      {removingMemberId === member.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isOwner && members.some((member) => member.userId !== currentUserId) && (
            <form onSubmit={handleTransferOwnership} className="stacked-form" noValidate>
              <div className="field">
                <label htmlFor="transfer-target">Transfer ownership to</label>
                <select
                  id="transfer-target"
                  required
                  value={transferTargetId}
                  onChange={(event) => setTransferTargetId(event.target.value)}
                >
                  <option value="">Choose a member…</option>
                  {members
                    .filter((member) => member.userId !== currentUserId)
                    .map((member) => (
                      <option key={member.id} value={member.userId}>
                        {memberLabel(member, currentUserId)}
                      </option>
                    ))}
                </select>
              </div>
              {transferError && (
                <p className="status-banner error" role="alert">
                  {transferError}
                </p>
              )}
              {transferSuccess && (
                <p className="status-banner success" role="status">
                  {transferSuccess}
                </p>
              )}
              <button type="submit" className="secondary" disabled={transferStatus === "submitting"}>
                {transferStatus === "submitting" ? "Transferring…" : "Transfer ownership"}
              </button>
            </form>
          )}

          {isOwner && (
            <form onSubmit={handleInvite} className="stacked-form" noValidate>
              <div className="field">
                <label htmlFor="invite-email">Invite an adult by email</label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </div>
              {inviteError && (
                <p className="status-banner error" role="alert">
                  {inviteError}
                </p>
              )}
              {inviteSuccess && (
                <p className="status-banner success" role="status">
                  {inviteSuccess}
                </p>
              )}
              <button type="submit" className="primary" disabled={inviteStatus === "submitting"}>
                {inviteStatus === "submitting" ? "Sending…" : "Send invitation"}
              </button>
            </form>
          )}
        </section>

        {isOwner && (
          <section className="panel" aria-labelledby="invitations-heading">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SENT THIS SESSION</p>
                <h2 id="invitations-heading">Pending invitations</h2>
              </div>
              <span className="count">{invitations.length}</span>
            </div>

            {invitations.length === 0 ? (
              <p className="empty-state">
                No invitations sent yet in this session. Use the form above to invite someone.
              </p>
            ) : (
              <ul className="invitation-list">
                {invitations.map((invitation) => (
                  <li key={invitation.id}>
                    <span>
                      {invitation.recipientEmail}
                      <small>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</small>
                    </span>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => handleRevoke(invitation)}
                      disabled={revokingId === invitation.id}
                      aria-label={`Revoke invitation to ${invitation.recipientEmail}`}
                    >
                      {revokingId === invitation.id ? "Revoking…" : "Revoke"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="panel" aria-labelledby="children-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NO LOGIN NEEDED</p>
              <h2 id="children-heading">Child profiles</h2>
            </div>
            <span className="count">{children.length}</span>
          </div>

          {children.length === 0 ? (
            <p className="empty-state">No child profiles yet.</p>
          ) : (
            <ul className="child-list">
              {children.map((child) => (
                <li key={child.id}>
                  <span>{child.displayName}</span>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => handleDeleteChild(child)}
                    disabled={deletingChildId === child.id}
                    aria-label={`Remove ${child.displayName}`}
                  >
                    {deletingChildId === child.id ? "Removing…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddChild} className="stacked-form" noValidate>
            <div className="field">
              <label htmlFor="child-name">Add a child profile</label>
              <input
                id="child-name"
                type="text"
                required
                maxLength={80}
                placeholder="Display name"
                value={childName}
                onChange={(event) => setChildName(event.target.value)}
              />
            </div>
            {childError && (
              <p className="status-banner error" role="alert">
                {childError}
              </p>
            )}
            <button type="submit" className="primary" disabled={childStatus === "submitting"}>
              {childStatus === "submitting" ? "Adding…" : "Add child"}
            </button>
          </form>
        </section>

        <CalendarPanel householdId={household.id} initialEvents={initialEvents} />

        <ChoresPanel
          householdId={household.id}
          initialChores={initialChores}
          members={members}
          childProfiles={children}
          currentUserId={currentUserId}
        />

        <ShoppingListsPanel householdId={household.id} initialShoppingLists={initialShoppingLists} />
      </div>
    </main>
  );
}
