package household.api.domain.chore

import io.micronaut.data.annotation.DateCreated
import io.micronaut.data.annotation.Id
import io.micronaut.data.annotation.MappedEntity
import io.micronaut.data.annotation.MappedProperty
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@MappedEntity("chores")
data class Chore(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("household_id")
    val householdId: UUID,
    val title: String,
    @field:MappedProperty("assignee_type")
    val assigneeType: String,
    @field:MappedProperty("assignee_user_id")
    val assigneeUserId: UUID? = null,
    @field:MappedProperty("assignee_child_id")
    val assigneeChildId: UUID? = null,
    @field:MappedProperty("recurrence_frequency")
    val recurrenceFrequency: String = "none",
    @field:MappedProperty("recurrence_interval")
    val recurrenceInterval: Int = 1,
    @field:MappedProperty("recurrence_end_date")
    val recurrenceEndDate: LocalDate? = null,
    @field:MappedProperty("created_by")
    val createdBy: UUID,
    @field:DateCreated
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
)

@MappedEntity("chore_occurrences")
data class ChoreOccurrence(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("chore_id")
    val choreId: UUID,
    @field:MappedProperty("due_date")
    val dueDate: LocalDate,
    val status: String = "pending",
    @field:MappedProperty("completed_at")
    val completedAt: OffsetDateTime? = null,
    @field:MappedProperty("completed_by")
    val completedBy: UUID? = null,
    @field:DateCreated
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
)
