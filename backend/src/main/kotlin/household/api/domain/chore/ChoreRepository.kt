package household.api.domain.chore

import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import java.time.LocalDate
import java.util.UUID

@JdbcRepository(dialect = Dialect.POSTGRES)
interface ChoreRepository : CrudRepository<Chore, UUID> {
    fun findByHouseholdId(householdId: UUID): List<Chore>
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface ChoreOccurrenceRepository : CrudRepository<ChoreOccurrence, UUID> {
    fun findByChoreId(choreId: UUID): List<ChoreOccurrence>
    fun findByChoreIdAndDueDate(choreId: UUID, dueDate: LocalDate): ChoreOccurrence?
}
