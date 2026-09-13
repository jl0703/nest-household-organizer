package household.api.domain.calendar

import household.api.domain.household.HouseholdException
import household.api.domain.household.HouseholdMemberRepository
import io.micronaut.transaction.annotation.Transactional
import jakarta.inject.Singleton
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

private val VALID_FREQUENCIES = setOf("none", "daily", "weekly", "monthly", "yearly")

data class CreateEventRequest(
    val title: String,
    val description: String? = null,
    val allDay: Boolean = false,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val recurrenceFrequency: String = "none",
    val recurrenceInterval: Int = 1,
    val recurrenceEndDate: LocalDate? = null,
)

data class UpdateEventRequest(
    val title: String,
    val description: String? = null,
    val allDay: Boolean = false,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val recurrenceFrequency: String = "none",
    val recurrenceInterval: Int = 1,
    val recurrenceEndDate: LocalDate? = null,
)

data class ModifyOccurrenceRequest(
    val overrideTitle: String? = null,
    val overrideStartsAt: OffsetDateTime? = null,
    val overrideEndsAt: OffsetDateTime? = null,
)

class CalendarException(message: String) : HouseholdException(message)

@Singleton
open class CalendarService(
    private val eventRepository: CalendarEventRepository,
    private val overrideRepository: EventOccurrenceOverrideRepository,
    private val memberRepository: HouseholdMemberRepository,
) {
    @Transactional
    open fun createEvent(householdId: UUID, actorId: UUID, request: CreateEventRequest): CalendarEvent {
        assertMember(householdId, actorId)
        validateRecurrence(request.recurrenceFrequency, request.recurrenceInterval)
        if (!request.endsAt.isAfter(request.startsAt) && !request.allDay) {
            throw CalendarException("Event end time must be after start time")
        }
        return eventRepository.save(
            CalendarEvent(
                householdId = householdId,
                title = request.title,
                description = request.description,
                allDay = request.allDay,
                startsAt = request.startsAt,
                endsAt = request.endsAt,
                recurrenceFrequency = request.recurrenceFrequency,
                recurrenceInterval = request.recurrenceInterval,
                recurrenceEndDate = request.recurrenceEndDate,
                createdBy = actorId,
            )
        )
    }

    fun listEvents(householdId: UUID, actorId: UUID): List<CalendarEvent> {
        assertMember(householdId, actorId)
        return eventRepository.findByHouseholdId(householdId)
    }

    fun getEvent(eventId: UUID, householdId: UUID, actorId: UUID): CalendarEvent {
        assertMember(householdId, actorId)
        return findEventInHousehold(eventId, householdId)
    }

    @Transactional
    open fun updateEvent(eventId: UUID, householdId: UUID, actorId: UUID, request: UpdateEventRequest): CalendarEvent {
        assertMember(householdId, actorId)
        val event = findEventInHousehold(eventId, householdId)
        validateRecurrence(request.recurrenceFrequency, request.recurrenceInterval)
        return eventRepository.update(
            event.copy(
                title = request.title,
                description = request.description,
                allDay = request.allDay,
                startsAt = request.startsAt,
                endsAt = request.endsAt,
                recurrenceFrequency = request.recurrenceFrequency,
                recurrenceInterval = request.recurrenceInterval,
                recurrenceEndDate = request.recurrenceEndDate,
            )
        )
    }

    @Transactional
    open fun deleteEvent(eventId: UUID, householdId: UUID, actorId: UUID) {
        assertMember(householdId, actorId)
        findEventInHousehold(eventId, householdId)
        eventRepository.deleteById(eventId)
    }

    fun listOccurrenceOverrides(eventId: UUID, householdId: UUID, actorId: UUID): List<EventOccurrenceOverride> {
        assertMember(householdId, actorId)
        findEventInHousehold(eventId, householdId)
        return overrideRepository.findByEventId(eventId)
    }

    @Transactional
    open fun skipOccurrence(eventId: UUID, householdId: UUID, actorId: UUID, occurrenceDate: LocalDate): EventOccurrenceOverride {
        assertMember(householdId, actorId)
        val event = findEventInHousehold(eventId, householdId)
        if (event.recurrenceFrequency == "none") {
            throw CalendarException("Cannot override an occurrence of a non-recurring event")
        }
        val existing = overrideRepository.findByEventIdAndOccurrenceDate(eventId, occurrenceDate)
        val override = EventOccurrenceOverride(
            id = existing?.id ?: UUID.randomUUID(),
            eventId = eventId,
            occurrenceDate = occurrenceDate,
            status = "skipped",
        )
        return if (existing != null) overrideRepository.update(override) else overrideRepository.save(override)
    }

    @Transactional
    open fun modifyOccurrence(
        eventId: UUID,
        householdId: UUID,
        actorId: UUID,
        occurrenceDate: LocalDate,
        request: ModifyOccurrenceRequest,
    ): EventOccurrenceOverride {
        assertMember(householdId, actorId)
        val event = findEventInHousehold(eventId, householdId)
        if (event.recurrenceFrequency == "none") {
            throw CalendarException("Cannot override an occurrence of a non-recurring event")
        }
        val existing = overrideRepository.findByEventIdAndOccurrenceDate(eventId, occurrenceDate)
        val override = EventOccurrenceOverride(
            id = existing?.id ?: UUID.randomUUID(),
            eventId = eventId,
            occurrenceDate = occurrenceDate,
            status = "modified",
            overrideStartsAt = request.overrideStartsAt,
            overrideEndsAt = request.overrideEndsAt,
            overrideTitle = request.overrideTitle,
        )
        return if (existing != null) overrideRepository.update(override) else overrideRepository.save(override)
    }

    private fun findEventInHousehold(eventId: UUID, householdId: UUID): CalendarEvent {
        val event = eventRepository.findById(eventId).orElseThrow { CalendarException("Event not found") }
        if (event.householdId != householdId) throw CalendarException("Event not found")
        return event
    }

    private fun validateRecurrence(frequency: String, interval: Int) {
        if (frequency !in VALID_FREQUENCIES) throw CalendarException("Invalid recurrence frequency")
        if (interval <= 0) throw CalendarException("Recurrence interval must be positive")
    }

    private fun assertMember(householdId: UUID, userId: UUID) {
        memberRepository.findByHouseholdIdAndUserId(householdId, userId)
            ?: throw CalendarException("Not a member of this household")
    }
}
