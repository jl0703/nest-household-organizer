package household.api.domain.household

import io.micronaut.data.annotation.DateCreated
import io.micronaut.data.annotation.Id
import io.micronaut.data.annotation.MappedEntity
import io.micronaut.data.annotation.MappedProperty
import java.time.OffsetDateTime
import java.util.UUID

@MappedEntity("households")
data class Household(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    val name: String,
    val timezone: String = "UTC",
    @field:MappedProperty("owner_id")
    val ownerId: UUID,
    @field:DateCreated
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
)

@MappedEntity("household_members")
data class HouseholdMember(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("household_id")
    val householdId: UUID,
    @field:MappedProperty("user_id")
    val userId: UUID,
    val role: String = "member",
    @field:MappedProperty("joined_at")
    val joinedAt: OffsetDateTime = OffsetDateTime.now(),
)

@MappedEntity("child_profiles")
data class ChildProfile(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("household_id")
    val householdId: UUID,
    @field:MappedProperty("created_by")
    val createdBy: UUID,
    @field:MappedProperty("display_name")
    val displayName: String,
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
)

@MappedEntity("invitations")
data class Invitation(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("household_id")
    val householdId: UUID,
    @field:MappedProperty("invited_by_id")
    val invitedById: UUID,
    @field:MappedProperty("recipient_email")
    val recipientEmail: String,
    val token: String,
    val status: String = "pending",
    @field:MappedProperty("expires_at")
    val expiresAt: OffsetDateTime,
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
    @field:MappedProperty("resolved_at")
    val resolvedAt: OffsetDateTime? = null,
)
