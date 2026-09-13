package household.api.domain.notification

import io.micronaut.data.annotation.DateCreated
import io.micronaut.data.annotation.DateUpdated
import io.micronaut.data.annotation.Id
import io.micronaut.data.annotation.MappedEntity
import io.micronaut.data.annotation.MappedProperty
import io.micronaut.serde.annotation.Serdeable
import java.time.LocalTime
import java.time.OffsetDateTime
import java.util.UUID

@Serdeable
@MappedEntity("notification_preferences")
data class NotificationPreference(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("household_id")
    val householdId: UUID,
    @field:MappedProperty("user_id")
    val userId: UUID,
    @field:MappedProperty("daily_digest_enabled")
    val dailyDigestEnabled: Boolean = true,
    @field:MappedProperty("event_reminders_enabled")
    val eventRemindersEnabled: Boolean = true,
    @field:MappedProperty("chore_reminders_enabled")
    val choreRemindersEnabled: Boolean = true,
    @field:MappedProperty("digest_time")
    val digestTime: LocalTime = LocalTime.of(8, 0),
    @field:DateUpdated
    @field:MappedProperty("updated_at")
    val updatedAt: OffsetDateTime = OffsetDateTime.now(),
)

@MappedEntity("notification_scheduler_state")
data class NotificationSchedulerState(
    @field:Id
    val id: String,
    @field:MappedProperty("last_scanned_at")
    val lastScannedAt: OffsetDateTime,
    @field:DateUpdated
    @field:MappedProperty("updated_at")
    val updatedAt: OffsetDateTime = OffsetDateTime.now(),
)

@MappedEntity("notification_jobs")
data class NotificationJob(
    @field:Id
    val id: UUID,
    @field:MappedProperty("household_id")
    val householdId: UUID,
    @field:MappedProperty("recipient_user_id")
    val recipientUserId: UUID,
    val type: String,
    @field:MappedProperty("source_type")
    val sourceType: String,
    @field:MappedProperty("source_id")
    val sourceId: UUID,
    @field:MappedProperty("occurrence_key")
    val occurrenceKey: String,
    @field:MappedProperty("scheduled_for")
    val scheduledFor: OffsetDateTime,
    val status: String = "pending",
    @field:MappedProperty("attempt_count")
    val attemptCount: Int = 0,
    @field:DateCreated
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
    @field:DateUpdated
    @field:MappedProperty("updated_at")
    val updatedAt: OffsetDateTime = OffsetDateTime.now(),
)
