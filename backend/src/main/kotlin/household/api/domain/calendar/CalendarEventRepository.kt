package household.api.domain.calendar

import io.micronaut.data.annotation.Query
import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@JdbcRepository(dialect = Dialect.POSTGRES)
interface CalendarEventRepository : CrudRepository<CalendarEvent, UUID> {
    fun findByHouseholdId(householdId: UUID): List<CalendarEvent>

    @Query(
        """SELECT event.* FROM calendar_events event
        WHERE event.household_id = :householdId AND (
            (event.recurrence_frequency = 'none' AND event.starts_at >= :from AND event.starts_at < :until)
            OR (event.recurrence_frequency <> 'none' AND event.starts_at < :until AND (
                event.recurrence_end_date IS NULL OR event.recurrence_end_date >= :fromDate
            ))
            OR EXISTS (
                SELECT 1 FROM event_occurrence_overrides occurrence_override
                WHERE occurrence_override.event_id = event.id AND occurrence_override.status = 'modified'
                    AND occurrence_override.override_starts_at >= :from
                    AND occurrence_override.override_starts_at < :until
            )
        )"""
    )
    fun findForNotificationWindow(
        householdId: UUID,
        from: OffsetDateTime,
        until: OffsetDateTime,
        fromDate: LocalDate,
    ): List<CalendarEvent>
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface EventOccurrenceOverrideRepository : CrudRepository<EventOccurrenceOverride, UUID> {
    fun findByEventId(eventId: UUID): List<EventOccurrenceOverride>
    fun findByEventIdAndOccurrenceDate(eventId: UUID, occurrenceDate: LocalDate): EventOccurrenceOverride?

    @Query(
        """SELECT * FROM event_occurrence_overrides
        WHERE event_id = :eventId AND (
            occurrence_date BETWEEN :fromDate AND :untilDate
            OR (status = 'modified' AND override_starts_at >= :from AND override_starts_at < :until)
        )"""
    )
    fun findForNotificationWindow(
        eventId: UUID,
        fromDate: LocalDate,
        untilDate: LocalDate,
        from: OffsetDateTime,
        until: OffsetDateTime,
    ): List<EventOccurrenceOverride>
}
