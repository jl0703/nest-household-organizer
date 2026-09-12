package household.api.domain.chore

import household.api.domain.household.ChildProfileRepository
import household.api.domain.household.HouseholdMemberRepository
import io.micronaut.transaction.annotation.Transactional
import jakarta.inject.Singleton
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

private val VALID_FREQUENCIES = setOf("none", "daily", "weekly", "monthly", "yearly")

data class CreateChoreRequest(
    val title: String,
    val assigneeType: String,
    val assigneeUserId: UUID? = null,
    val assigneeChildId: UUID? = null,
    val firstDueDate: LocalDate,
    val recurrenceFrequency: String = "none",
    val recurrenceInterval: Int = 1,
    val recurrenceEndDate: LocalDate? = null,
)

class ChoreException(message: String) : RuntimeException(message)

@Singleton
open class ChoreService(
    private val choreRepository: ChoreRepository,
    private val occurrenceRepository: ChoreOccurrenceRepository,
    private val memberRepository: HouseholdMemberRepository,
    private val childProfileRepository: ChildProfileRepository,
) {
    @Transactional
    open fun createChore(householdId: UUID, actorId: UUID, request: CreateChoreRequest): Chore {
        assertMember(householdId, actorId)
        validateRecurrence(request.recurrenceFrequency, request.recurrenceInterval)
        validateAssignee(householdId, request.assigneeType, request.assigneeUserId, request.assigneeChildId)

        val chore = choreRepository.save(
            Chore(
                householdId = householdId,
                title = request.title,
                assigneeType = request.assigneeType,
                assigneeUserId = request.assigneeUserId,
                assigneeChildId = request.assigneeChildId,
                recurrenceFrequency = request.recurrenceFrequency,
                recurrenceInterval = request.recurrenceInterval,
                recurrenceEndDate = request.recurrenceEndDate,
                createdBy = actorId,
            )
        )
        occurrenceRepository.save(ChoreOccurrence(choreId = chore.id, dueDate = request.firstDueDate))
        return chore
    }

    fun listChores(householdId: UUID, actorId: UUID): List<Chore> {
        assertMember(householdId, actorId)
        return choreRepository.findByHouseholdId(householdId)
    }

    fun listOccurrences(choreId: UUID, householdId: UUID, actorId: UUID): List<ChoreOccurrence> {
        assertMember(householdId, actorId)
        findChoreInHousehold(choreId, householdId)
        return occurrenceRepository.findByChoreId(choreId)
    }

    @Transactional
    open fun deleteChore(choreId: UUID, householdId: UUID, actorId: UUID) {
        assertMember(householdId, actorId)
        findChoreInHousehold(choreId, householdId)
        choreRepository.deleteById(choreId)
    }

    @Transactional
    open fun completeOccurrence(occurrenceId: UUID, householdId: UUID, actorId: UUID): ChoreOccurrence {
        assertMember(householdId, actorId)
        val occurrence = occurrenceRepository.findById(occurrenceId).orElseThrow {
            ChoreException("Chore occurrence not found")
        }
        val chore = findChoreInHousehold(occurrence.choreId, householdId)
        if (occurrence.status != "pending") throw ChoreException("Only pending occurrences can be completed")

        val updated = occurrenceRepository.update(
            occurrence.copy(status = "completed", completedAt = OffsetDateTime.now(), completedBy = actorId)
        )
        generateNextOccurrenceIfNeeded(chore, occurrence.dueDate)
        return updated
    }

    @Transactional
    open fun skipOccurrence(occurrenceId: UUID, householdId: UUID, actorId: UUID): ChoreOccurrence {
        assertMember(householdId, actorId)
        val occurrence = occurrenceRepository.findById(occurrenceId).orElseThrow {
            ChoreException("Chore occurrence not found")
        }
        val chore = findChoreInHousehold(occurrence.choreId, householdId)
        if (occurrence.status != "pending") throw ChoreException("Only pending occurrences can be skipped")

        val updated = occurrenceRepository.update(occurrence.copy(status = "skipped"))
        generateNextOccurrenceIfNeeded(chore, occurrence.dueDate)
        return updated
    }

    private fun generateNextOccurrenceIfNeeded(chore: Chore, fromDueDate: LocalDate) {
        if (chore.recurrenceFrequency == "none") return
        val nextDueDate = nextDate(fromDueDate, chore.recurrenceFrequency, chore.recurrenceInterval)
        if (chore.recurrenceEndDate != null && nextDueDate.isAfter(chore.recurrenceEndDate)) return
        if (occurrenceRepository.findByChoreIdAndDueDate(chore.id, nextDueDate) != null) return
        occurrenceRepository.save(ChoreOccurrence(choreId = chore.id, dueDate = nextDueDate))
    }

    private fun nextDate(from: LocalDate, frequency: String, interval: Int): LocalDate = when (frequency) {
        "daily" -> from.plusDays(interval.toLong())
        "weekly" -> from.plusWeeks(interval.toLong())
        "monthly" -> from.plusMonths(interval.toLong())
        "yearly" -> from.plusYears(interval.toLong())
        else -> from
    }

    private fun validateAssignee(householdId: UUID, assigneeType: String, userId: UUID?, childId: UUID?) {
        when (assigneeType) {
            "adult" -> {
                if (userId == null || childId != null) throw ChoreException("Adult chores must set exactly assigneeUserId")
                memberRepository.findByHouseholdIdAndUserId(householdId, userId)
                    ?: throw ChoreException("Assignee must be a household member")
            }
            "child" -> {
                if (childId == null || userId != null) throw ChoreException("Child chores must set exactly assigneeChildId")
                val child = childProfileRepository.findById(childId).orElseThrow {
                    ChoreException("Assignee child profile not found")
                }
                if (child.householdId != householdId) throw ChoreException("Assignee child profile not found")
            }
            else -> throw ChoreException("Invalid assignee type")
        }
    }

    private fun findChoreInHousehold(choreId: UUID, householdId: UUID): Chore {
        val chore = choreRepository.findById(choreId).orElseThrow { ChoreException("Chore not found") }
        if (chore.householdId != householdId) throw ChoreException("Chore not found")
        return chore
    }

    private fun validateRecurrence(frequency: String, interval: Int) {
        if (frequency !in VALID_FREQUENCIES) throw ChoreException("Invalid recurrence frequency")
        if (interval <= 0) throw ChoreException("Recurrence interval must be positive")
    }

    private fun assertMember(householdId: UUID, userId: UUID) {
        memberRepository.findByHouseholdIdAndUserId(householdId, userId)
            ?: throw ChoreException("Not a member of this household")
    }
}
