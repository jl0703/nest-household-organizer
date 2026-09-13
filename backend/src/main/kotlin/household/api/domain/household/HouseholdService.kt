package household.api.domain.household

import household.api.domain.user.User
import household.api.domain.user.UserRepository
import io.micronaut.transaction.annotation.Transactional
import jakarta.inject.Singleton
import java.time.OffsetDateTime
import java.util.UUID

data class CreateHouseholdRequest(val name: String, val timezone: String = "UTC")
data class InviteRequest(val recipientEmail: String)
data class TransferOwnershipRequest(val newOwnerId: UUID)
data class CreateChildProfileRequest(val displayName: String)

open class HouseholdException(message: String) : RuntimeException(message)

@Singleton
open class HouseholdService(
    private val householdRepository: HouseholdRepository,
    private val memberRepository: HouseholdMemberRepository,
    private val invitationRepository: InvitationRepository,
    private val childProfileRepository: ChildProfileRepository,
    private val userRepository: UserRepository,
) {
    @Transactional
    open fun createHousehold(owner: User, request: CreateHouseholdRequest): Household {
        val household = householdRepository.save(
            Household(name = request.name, timezone = request.timezone, ownerId = owner.id)
        )
        memberRepository.save(
            HouseholdMember(householdId = household.id, userId = owner.id, role = "owner")
        )
        return household
    }

    fun getHousehold(householdId: UUID, requestingUserId: UUID): Household {
        val household = householdRepository.findById(householdId).orElseThrow {
            HouseholdException("Household not found")
        }
        assertMember(householdId, requestingUserId)
        return household
    }

    fun listHouseholdsForUser(userId: UUID): List<Household> {
        val memberships = memberRepository.findByUserId(userId)
        return memberships.mapNotNull { householdRepository.findById(it.householdId).orElse(null) }
    }

    @Transactional
    open fun inviteMember(householdId: UUID, actorId: UUID, request: InviteRequest): Invitation {
        assertOwner(householdId, actorId)
        val token = UUID.randomUUID().toString()
        return invitationRepository.save(
            Invitation(
                householdId = householdId,
                invitedById = actorId,
                recipientEmail = request.recipientEmail,
                token = token,
                expiresAt = OffsetDateTime.now().plusDays(7),
            )
        )
    }

    @Transactional
    open fun acceptInvitation(token: String, acceptingUser: User): HouseholdMember {
        val invitation = invitationRepository.findByToken(token)
            ?: throw HouseholdException("Invitation not found")
        if (invitation.status != "pending") throw HouseholdException("Invitation is no longer valid")
        if (invitation.expiresAt.isBefore(OffsetDateTime.now())) {
            invitationRepository.update(invitation.copy(status = "expired", resolvedAt = OffsetDateTime.now()))
            throw HouseholdException("Invitation has expired")
        }
        val member = memberRepository.save(
            HouseholdMember(householdId = invitation.householdId, userId = acceptingUser.id, role = "member")
        )
        invitationRepository.update(invitation.copy(status = "accepted", resolvedAt = OffsetDateTime.now()))
        return member
    }

    @Transactional
    open fun revokeInvitation(invitationId: UUID, actorId: UUID) {
        val invitation = invitationRepository.findById(invitationId).orElseThrow {
            HouseholdException("Invitation not found")
        }
        assertOwner(invitation.householdId, actorId)
        invitationRepository.update(invitation.copy(status = "revoked", resolvedAt = OffsetDateTime.now()))
    }

    @Transactional
    open fun removeMember(householdId: UUID, targetUserId: UUID, actorId: UUID) {
        assertOwner(householdId, actorId)
        if (targetUserId == actorId) throw HouseholdException("Owner cannot remove themselves; transfer ownership first")
        memberRepository.deleteByHouseholdIdAndUserId(householdId, targetUserId)
    }

    @Transactional
    open fun transferOwnership(householdId: UUID, actorId: UUID, request: TransferOwnershipRequest) {
        assertOwner(householdId, actorId)
        val newOwnerMembership = memberRepository.findByHouseholdIdAndUserId(householdId, request.newOwnerId)
            ?: throw HouseholdException("New owner must already be a household member")
        val household = householdRepository.findById(householdId).get()
        householdRepository.update(household.copy(ownerId = request.newOwnerId))
        memberRepository.update(newOwnerMembership.copy(role = "owner"))
        val currentOwnerMembership = memberRepository.findByHouseholdIdAndUserId(householdId, actorId)
        if (currentOwnerMembership != null) {
            memberRepository.update(currentOwnerMembership.copy(role = "member"))
        }
    }

    fun listMembers(householdId: UUID, requestingUserId: UUID): List<HouseholdMember> {
        assertMember(householdId, requestingUserId)
        return memberRepository.findByHouseholdId(householdId)
    }

    @Transactional
    open fun createChildProfile(householdId: UUID, actorId: UUID, request: CreateChildProfileRequest): ChildProfile {
        assertMember(householdId, actorId)
        return childProfileRepository.save(
            ChildProfile(householdId = householdId, createdBy = actorId, displayName = request.displayName)
        )
    }

    fun listChildProfiles(householdId: UUID, requestingUserId: UUID): List<ChildProfile> {
        assertMember(householdId, requestingUserId)
        return childProfileRepository.findByHouseholdId(householdId)
    }

    @Transactional
    open fun deleteChildProfile(childProfileId: UUID, householdId: UUID, actorId: UUID) {
        assertMember(householdId, actorId)
        childProfileRepository.deleteById(childProfileId)
    }

    private fun assertMember(householdId: UUID, userId: UUID) {
        memberRepository.findByHouseholdIdAndUserId(householdId, userId)
            ?: throw HouseholdException("Not a member of this household")
    }

    private fun assertOwner(householdId: UUID, userId: UUID) {
        val membership = memberRepository.findByHouseholdIdAndUserId(householdId, userId)
            ?: throw HouseholdException("Not a member of this household")
        if (membership.role != "owner") throw HouseholdException("Only the household owner can perform this action")
    }
}
