package household.api.domain.user

import io.micronaut.data.annotation.DateCreated
import io.micronaut.data.annotation.Id
import io.micronaut.data.annotation.MappedEntity
import io.micronaut.data.annotation.MappedProperty
import java.time.OffsetDateTime
import java.util.UUID

@MappedEntity("users")
data class User(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("supabase_uid")
    val supabaseUid: String,
    @field:MappedProperty("display_name")
    val displayName: String,
    val email: String,
    @field:DateCreated
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
    @field:MappedProperty("deleted_at")
    val deletedAt: OffsetDateTime? = null,
)
