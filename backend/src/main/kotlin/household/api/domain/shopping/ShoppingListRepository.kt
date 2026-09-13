package household.api.domain.shopping

import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import java.util.UUID

@JdbcRepository(dialect = Dialect.POSTGRES)
interface ShoppingListRepository : CrudRepository<ShoppingList, UUID> {
    fun findByHouseholdId(householdId: UUID): List<ShoppingList>
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface ShoppingItemRepository : CrudRepository<ShoppingItem, UUID> {
    fun findByListId(listId: UUID): List<ShoppingItem>
}
