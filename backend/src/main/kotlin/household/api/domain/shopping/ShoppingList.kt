package household.api.domain.shopping

import io.micronaut.data.annotation.DateCreated
import io.micronaut.data.annotation.Id
import io.micronaut.data.annotation.MappedEntity
import io.micronaut.data.annotation.MappedProperty
import java.time.OffsetDateTime
import java.util.UUID

@MappedEntity("shopping_lists")
data class ShoppingList(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("household_id")
    val householdId: UUID,
    val name: String,
    @field:MappedProperty("created_by")
    val createdBy: UUID,
    @field:DateCreated
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
)

@MappedEntity("shopping_items")
data class ShoppingItem(
    @field:Id
    val id: UUID = UUID.randomUUID(),
    @field:MappedProperty("list_id")
    val listId: UUID,
    val name: String,
    val quantity: String? = null,
    val category: String? = null,
    val checked: Boolean = false,
    @field:MappedProperty("created_by")
    val createdBy: UUID,
    @field:DateCreated
    @field:MappedProperty("created_at")
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
)
