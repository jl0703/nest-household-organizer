package household.api.domain

import household.api.domain.household.*
import household.api.domain.user.User
import household.api.domain.user.UserRepository
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.util.UUID

@MicronautTest
class HouseholdServiceTest {

    @Inject lateinit var householdService: HouseholdService
    @Inject lateinit var householdRepository: HouseholdRepository
    @Inject lateinit var memberRepository: HouseholdMemberRepository
    @Inject lateinit var invitationRepository: InvitationRepository
    @Inject lateinit var childProfileRepository: ChildProfileRepository
    @Inject lateinit var userRepository: UserRepository

    private lateinit var owner: User
    private lateinit var member: User

    @BeforeEach
    fun setup() {
        owner = userRepository.save(User(supabaseUid = UUID.randomUUID().toString(), email = "owner@test.com", displayName = "Owner"))
        member = userRepository.save(User(supabaseUid = UUID.randomUUID().toString(), email = "member@test.com", displayName = "Member"))
    }

    @Test
    fun `createHousehold creates household and adds owner as member`() {
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("The Smiths", "Europe/London"))

        assertNotNull(household.id)
        assertEquals("The Smiths", household.name)
        assertEquals("Europe/London", household.timezone)
        assertEquals(owner.id, household.ownerId)

        val members = memberRepository.findByHouseholdId(household.id)
        assertEquals(1, members.size)
        assertEquals("owner", members.first().role)
    }

    @Test
    fun `inviteMember fails for non-owner`() {
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("The Smiths"))
        memberRepository.save(HouseholdMember(householdId = household.id, userId = member.id, role = "member"))

        assertThrows<HouseholdException> {
            householdService.inviteMember(household.id, member.id, InviteRequest("other@test.com"))
        }
    }

    @Test
    fun `acceptInvitation adds member and marks invitation accepted`() {
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("The Smiths"))
        val invitation = householdService.inviteMember(household.id, owner.id, InviteRequest(member.email))

        val newMembership = householdService.acceptInvitation(invitation.token, member)

        assertEquals(household.id, newMembership.householdId)
        assertEquals(member.id, newMembership.userId)

        val updatedInvitation = invitationRepository.findById(invitation.id).get()
        assertEquals("accepted", updatedInvitation.status)
    }

    @Test
    fun `acceptInvitation fails for already-accepted invitation`() {
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("The Smiths"))
        val invitation = householdService.inviteMember(household.id, owner.id, InviteRequest(member.email))
        householdService.acceptInvitation(invitation.token, member)

        assertThrows<HouseholdException> {
            householdService.acceptInvitation(invitation.token, member)
        }
    }

    @Test
    fun `transferOwnership changes owner and demotes previous owner`() {
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("The Smiths"))
        memberRepository.save(HouseholdMember(householdId = household.id, userId = member.id, role = "member"))

        householdService.transferOwnership(household.id, owner.id, TransferOwnershipRequest(member.id))

        val updatedHousehold = householdRepository.findById(household.id).get()
        assertEquals(member.id, updatedHousehold.ownerId)

        val newOwnerMembership = memberRepository.findByHouseholdIdAndUserId(household.id, member.id)!!
        assertEquals("owner", newOwnerMembership.role)

        val formerOwnerMembership = memberRepository.findByHouseholdIdAndUserId(household.id, owner.id)!!
        assertEquals("member", formerOwnerMembership.role)
    }

    @Test
    fun `removeMember fails when non-owner attempts it`() {
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("The Smiths"))
        val other = userRepository.save(User(supabaseUid = UUID.randomUUID().toString(), email = "other@test.com", displayName = "Other"))
        memberRepository.save(HouseholdMember(householdId = household.id, userId = member.id, role = "member"))
        memberRepository.save(HouseholdMember(householdId = household.id, userId = other.id, role = "member"))

        assertThrows<HouseholdException> {
            householdService.removeMember(household.id, other.id, member.id)
        }
    }

    @Test
    fun `cross-household access is denied`() {
        val household1 = householdService.createHousehold(owner, CreateHouseholdRequest("Household 1"))
        householdService.createHousehold(member, CreateHouseholdRequest("Household 2"))

        assertThrows<HouseholdException> {
            householdService.getHousehold(household1.id, member.id)
        }
    }

    @Test
    fun `createChildProfile and listChildProfiles work for members`() {
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("The Smiths"))

        val child = householdService.createChildProfile(household.id, owner.id, CreateChildProfileRequest("Timmy"))

        assertEquals("Timmy", child.displayName)
        assertEquals(household.id, child.householdId)

        val children = householdService.listChildProfiles(household.id, owner.id)
        assertEquals(1, children.size)
    }
}
