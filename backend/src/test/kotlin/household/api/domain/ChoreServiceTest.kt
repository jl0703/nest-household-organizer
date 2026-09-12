package household.api.domain

import household.api.domain.chore.*
import household.api.domain.household.*
import household.api.domain.user.User
import household.api.domain.user.UserRepository
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDate
import java.util.UUID

@MicronautTest
class ChoreServiceTest {

    @Inject lateinit var choreService: ChoreService
    @Inject lateinit var householdService: HouseholdService
    @Inject lateinit var memberRepository: HouseholdMemberRepository
    @Inject lateinit var userRepository: UserRepository
    @Inject lateinit var childProfileRepository: ChildProfileRepository

    private lateinit var owner: User
    private lateinit var member: User
    private lateinit var outsider: User
    private lateinit var householdId: UUID

    @BeforeEach
    fun setup() {
        owner = userRepository.save(User(supabaseUid = UUID.randomUUID().toString(), email = "owner@test.com", displayName = "Owner"))
        member = userRepository.save(User(supabaseUid = UUID.randomUUID().toString(), email = "member@test.com", displayName = "Member"))
        outsider = userRepository.save(User(supabaseUid = UUID.randomUUID().toString(), email = "outsider@test.com", displayName = "Outsider"))
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("The Smiths"))
        householdId = household.id
        memberRepository.save(HouseholdMember(householdId = householdId, userId = member.id, role = "member"))
    }

    @Test
    fun `createChore for an adult assignee works`() {
        val chore = choreService.createChore(
            householdId,
            owner.id,
            CreateChoreRequest(
                title = "Take out trash",
                assigneeType = "adult",
                assigneeUserId = member.id,
                firstDueDate = LocalDate.of(2026, 1, 1),
            )
        )

        assertEquals(member.id, chore.assigneeUserId)
        val occurrences = choreService.listOccurrences(chore.id, householdId, owner.id)
        assertEquals(1, occurrences.size)
        assertEquals("pending", occurrences.first().status)
    }

    @Test
    fun `createChore for a child assignee works`() {
        val child = householdService.createChildProfile(householdId, owner.id, CreateChildProfileRequest("Timmy"))

        val chore = choreService.createChore(
            householdId,
            owner.id,
            CreateChoreRequest(
                title = "Feed the dog",
                assigneeType = "child",
                assigneeChildId = child.id,
                firstDueDate = LocalDate.of(2026, 1, 1),
            )
        )

        assertEquals(child.id, chore.assigneeChildId)
    }

    @Test
    fun `createChore fails when both assignee fields are set`() {
        val child = householdService.createChildProfile(householdId, owner.id, CreateChildProfileRequest("Timmy"))

        assertThrows<ChoreException> {
            choreService.createChore(
                householdId,
                owner.id,
                CreateChoreRequest(
                    title = "Feed the dog",
                    assigneeType = "adult",
                    assigneeUserId = member.id,
                    assigneeChildId = child.id,
                    firstDueDate = LocalDate.of(2026, 1, 1),
                )
            )
        }
    }

    @Test
    fun `createChore fails when assignee user is not a household member`() {
        assertThrows<ChoreException> {
            choreService.createChore(
                householdId,
                owner.id,
                CreateChoreRequest(
                    title = "Take out trash",
                    assigneeType = "adult",
                    assigneeUserId = outsider.id,
                    firstDueDate = LocalDate.of(2026, 1, 1),
                )
            )
        }
    }

    @Test
    fun `createChore fails for non-member actor`() {
        assertThrows<ChoreException> {
            choreService.createChore(
                householdId,
                outsider.id,
                CreateChoreRequest(
                    title = "Take out trash",
                    assigneeType = "adult",
                    assigneeUserId = member.id,
                    firstDueDate = LocalDate.of(2026, 1, 1),
                )
            )
        }
    }

    @Test
    fun `completing a recurring chore occurrence generates the next occurrence`() {
        val chore = choreService.createChore(
            householdId,
            owner.id,
            CreateChoreRequest(
                title = "Take out trash",
                assigneeType = "adult",
                assigneeUserId = member.id,
                firstDueDate = LocalDate.of(2026, 1, 1),
                recurrenceFrequency = "weekly",
                recurrenceInterval = 1,
            )
        )
        val firstOccurrence = choreService.listOccurrences(chore.id, householdId, owner.id).first()

        choreService.completeOccurrence(firstOccurrence.id, householdId, member.id)

        val occurrences = choreService.listOccurrences(chore.id, householdId, owner.id)
        assertEquals(2, occurrences.size)
        val completed = occurrences.first { it.id == firstOccurrence.id }
        assertEquals("completed", completed.status)
        assertNotNull(completed.completedAt)
        val next = occurrences.first { it.id != firstOccurrence.id }
        assertEquals(LocalDate.of(2026, 1, 8), next.dueDate)
        assertEquals("pending", next.status)
    }

    @Test
    fun `completing a non-recurring chore occurrence does not generate a next occurrence`() {
        val chore = choreService.createChore(
            householdId,
            owner.id,
            CreateChoreRequest(
                title = "One-off cleanup",
                assigneeType = "adult",
                assigneeUserId = member.id,
                firstDueDate = LocalDate.of(2026, 1, 1),
            )
        )
        val occurrence = choreService.listOccurrences(chore.id, householdId, owner.id).first()

        choreService.completeOccurrence(occurrence.id, householdId, owner.id)

        val occurrences = choreService.listOccurrences(chore.id, householdId, owner.id)
        assertEquals(1, occurrences.size)
    }

    @Test
    fun `completing an already-completed occurrence fails`() {
        val chore = choreService.createChore(
            householdId,
            owner.id,
            CreateChoreRequest(
                title = "One-off cleanup",
                assigneeType = "adult",
                assigneeUserId = member.id,
                firstDueDate = LocalDate.of(2026, 1, 1),
            )
        )
        val occurrence = choreService.listOccurrences(chore.id, householdId, owner.id).first()
        choreService.completeOccurrence(occurrence.id, householdId, owner.id)

        assertThrows<ChoreException> {
            choreService.completeOccurrence(occurrence.id, householdId, owner.id)
        }
    }

    @Test
    fun `cross-household chore access is denied`() {
        val otherHousehold = householdService.createHousehold(outsider, CreateHouseholdRequest("Other House"))
        val chore = choreService.createChore(
            householdId,
            owner.id,
            CreateChoreRequest(
                title = "Take out trash",
                assigneeType = "adult",
                assigneeUserId = member.id,
                firstDueDate = LocalDate.of(2026, 1, 1),
            )
        )

        assertThrows<ChoreException> {
            choreService.listOccurrences(chore.id, otherHousehold.id, outsider.id)
        }
    }
}
