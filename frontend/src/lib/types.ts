export type HouseholdRole = "owner" | "member";

export interface Household {
  id: string;
  name: string;
  timezone: string;
  ownerId: string;
  createdAt: string;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: string;
}

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface Invitation {
  id: string;
  householdId: string;
  invitedById: string;
  recipientEmail: string;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ChildProfile {
  id: string;
  householdId: string;
  createdBy: string;
  displayName: string;
  createdAt: string;
}
