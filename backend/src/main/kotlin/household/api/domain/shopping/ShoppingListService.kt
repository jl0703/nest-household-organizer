package household.api.domain.shopping

import household.api.domain.household.HouseholdException
import household.api.domain.household.HouseholdMemberRepository
import io.micronaut.transaction.annotation.Transactional
import jakarta.inject.Singleton
import java.util.UUID

data class CreateShoppingListRequest(val name: String)
data class RenameShoppingListRequest(val name: String)
data class CreateShoppingItemRequest(
    val name: String,
    val quantity: String? = null,
    val category: String? = null,
)
data class UpdateShoppingItemRequest(
    val name: String,
    val quantity: String? = null,
    val category: String? = null,
    val checked: Boolean = false,
)

class ShoppingListException(message: String) : HouseholdException(message)

@Singleton
open class ShoppingListService(
    private val listRepository: ShoppingListRepository,
    private val itemRepository: ShoppingItemRepository,
    private val memberRepository: HouseholdMemberRepository,
) {
    @Transactional
    open fun createList(householdId: UUID, actorId: UUID, request: CreateShoppingListRequest): ShoppingList {
        assertMember(householdId, actorId)
        return listRepository.save(
            ShoppingList(householdId = householdId, name = request.name, createdBy = actorId)
        )
    }

    fun listLists(householdId: UUID, actorId: UUID): List<ShoppingList> {
        assertMember(householdId, actorId)
        return listRepository.findByHouseholdId(householdId)
    }

    @Transactional
    open fun renameList(listId: UUID, householdId: UUID, actorId: UUID, request: RenameShoppingListRequest): ShoppingList {
        assertMember(householdId, actorId)
        val list = findListInHousehold(listId, householdId)
        return listRepository.update(list.copy(name = request.name))
    }

    @Transactional
    open fun deleteList(listId: UUID, householdId: UUID, actorId: UUID) {
        assertMember(householdId, actorId)
        findListInHousehold(listId, householdId)
        listRepository.deleteById(listId)
    }

    @Transactional
    open fun addItem(listId: UUID, householdId: UUID, actorId: UUID, request: CreateShoppingItemRequest): ShoppingItem {
        assertMember(householdId, actorId)
        findListInHousehold(listId, householdId)
        return itemRepository.save(
            ShoppingItem(
                listId = listId,
                name = request.name,
                quantity = request.quantity,
                category = request.category,
                createdBy = actorId,
            )
        )
    }

    fun listItems(listId: UUID, householdId: UUID, actorId: UUID): List<ShoppingItem> {
        assertMember(householdId, actorId)
        findListInHousehold(listId, householdId)
        return itemRepository.findByListId(listId)
    }

    @Transactional
    open fun updateItem(itemId: UUID, listId: UUID, householdId: UUID, actorId: UUID, request: UpdateShoppingItemRequest): ShoppingItem {
        assertMember(householdId, actorId)
        findListInHousehold(listId, householdId)
        val item = findItemInList(itemId, listId)
        return itemRepository.update(
            item.copy(
                name = request.name,
                quantity = request.quantity,
                category = request.category,
                checked = request.checked,
            )
        )
    }

    @Transactional
    open fun deleteItem(itemId: UUID, listId: UUID, householdId: UUID, actorId: UUID) {
        assertMember(householdId, actorId)
        findListInHousehold(listId, householdId)
        findItemInList(itemId, listId)
        itemRepository.deleteById(itemId)
    }

    private fun findListInHousehold(listId: UUID, householdId: UUID): ShoppingList {
        val list = listRepository.findById(listId).orElseThrow { ShoppingListException("Shopping list not found") }
        if (list.householdId != householdId) throw ShoppingListException("Shopping list not found")
        return list
    }

    private fun findItemInList(itemId: UUID, listId: UUID): ShoppingItem {
        val item = itemRepository.findById(itemId).orElseThrow { ShoppingListException("Shopping item not found") }
        if (item.listId != listId) throw ShoppingListException("Shopping item not found")
        return item
    }

    private fun assertMember(householdId: UUID, userId: UUID) {
        memberRepository.findByHouseholdIdAndUserId(householdId, userId)
            ?: throw ShoppingListException("Not a member of this household")
    }
}
