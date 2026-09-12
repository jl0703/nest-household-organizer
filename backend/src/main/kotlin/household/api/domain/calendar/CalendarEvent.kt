package household.api.domain.calendar

import io.micronaut.data.annotation.DateCreated
import io.micronaut.data.annotation.Id
import io.micronaut.data.annotation.MappedEntity
import io.micronaut.data.annotation.MappedProperty
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@MappedEntity("calendar_events")
data class CalendarEvent(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("household_id")
    val householdId: UUID,
    val title: String,
    val description: String? = null,
    @field:MappedProperty("all_day")
    val allDay: Boolean = false,
    @field:MappedProperty("starts_at")
    val startsAt: OffsetDateTime,
    @field:MappedProperty("ends_at")
    val endsAt: OffsetDateTime,
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

@MappedEntity("event_occurrence_overrides")
data class EventOccurrenceOverride(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("event_id")
    val eventId: UUID,
    @field:MappedProperty("occurrence_date")
    val occurrenceDate: LocalDate,
    val status: String,
    @field:MappedProperty("override_starts_at")
    val overrideStartsAt: OffsetDateTime? = null,
    @field:MappedProperty("override_ends_at")
    val overrideEndsAt: OffsetDateTime? = null,
    @field:MappedProperty("override_title")
    val overrideTitle: String? = null,
    @field:DateCreated
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
)
