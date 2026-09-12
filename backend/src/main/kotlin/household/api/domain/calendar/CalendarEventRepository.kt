package household.api.domain.calendar

import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import java.time.LocalDate
import java.util.UUID

@JdbcRepository(dialect = Dialect.POSTGRES)
interface CalendarEventRepository : CrudRepository<CalendarEvent, UUID> {
    fun findByHouseholdId(householdId: UUID): List<CalendarEvent>
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface EventOccurrenceOverrideRepository : CrudRepository<EventOccurrenceOverride, UUID> {
    fun findByEventId(eventId: UUID): List<EventOccurrenceOverride>
    fun findByEventIdAndOccurrenceDate(eventId: UUID, occurrenceDate: LocalDate): EventOccurrenceOverride?
}
