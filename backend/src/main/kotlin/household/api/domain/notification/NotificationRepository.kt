package household.api.domain.notification

import io.micronaut.data.annotation.Query
import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import java.time.OffsetDateTime
import java.util.UUID

@JdbcRepository(dialect = Dialect.POSTGRES)
interface NotificationPreferenceRepository : CrudRepository<NotificationPreference, UUID> {
    fun findByHouseholdIdAndUserId(householdId: UUID, userId: UUID): NotificationPreference?
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface NotificationSchedulerStateRepository : CrudRepository<NotificationSchedulerState, String> {
    @Query(
        """UPDATE notification_scheduler_state
        SET last_scanned_at = GREATEST(last_scanned_at, :lastScannedAt), updated_at = now()
        WHERE id = :id"""
    )
    fun advanceLastScannedAt(id: String, lastScannedAt: OffsetDateTime): Long
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface NotificationJobRepository : CrudRepository<NotificationJob, UUID> {
    fun findByHouseholdId(householdId: UUID): List<NotificationJob>
}
