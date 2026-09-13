package household.api.domain.chore

import io.micronaut.data.annotation.Query
import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import java.time.LocalDate
import java.util.UUID

@JdbcRepository(dialect = Dialect.POSTGRES)
interface ChoreRepository : CrudRepository<Chore, UUID> {
    fun findByHouseholdId(householdId: UUID): List<Chore>

    @Query(
        """SELECT DISTINCT chore.* FROM chores chore
        JOIN chore_occurrences occurrence ON occurrence.chore_id = chore.id
        WHERE chore.household_id = :householdId AND occurrence.status = 'pending'
            AND occurrence.due_date BETWEEN :fromDate AND :untilDate"""
    )
    fun findForNotificationWindow(householdId: UUID, fromDate: LocalDate, untilDate: LocalDate): List<Chore>
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface ChoreOccurrenceRepository : CrudRepository<ChoreOccurrence, UUID> {
    fun findByChoreId(choreId: UUID): List<ChoreOccurrence>
    fun findByChoreIdAndDueDate(choreId: UUID, dueDate: LocalDate): ChoreOccurrence?
    fun findByChoreIdAndStatusAndDueDateBetween(
        choreId: UUID,
        status: String,
        fromDate: LocalDate,
        untilDate: LocalDate,
    ): List<ChoreOccurrence>
}
