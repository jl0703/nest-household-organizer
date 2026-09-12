package household.api.domain

import household.api.domain.household.CreateHouseholdRequest
import household.api.domain.household.HouseholdMember
import household.api.domain.household.HouseholdMemberRepository
import household.api.domain.household.HouseholdService
import household.api.domain.shopping.*
import household.api.domain.user.User
import household.api.domain.user.UserRepository
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.util.UUID

@MicronautTest
class ShoppingListServiceTest {

    @Inject lateinit var shoppingListService: ShoppingListService
    @Inject lateinit var householdService: HouseholdService
    @Inject lateinit var memberRepository: HouseholdMemberRepository
    @Inject lateinit var userRepository: UserRepository

    private lateinit var owner: User
    private lateinit var member: User
    private lateinit var outsider: User
    private lateinit var householdId: UUID

    @BeforeEach
    fun setup() {
        owner = userRepository.save(User(supabaseUid = UUID.randomUUID().toString(), email = "owner@test.com", displayName = "Owner"))
        member = userRepository.save(User(supabaseUid = UUID.randomUUID().toString(), email = "member@test.com", displayName = "Member"))
        outsider = userRepository.save(User(supabaseUid = UUID.randomUUID().toString(), email = "outsider@test.com", displayName = "Outsider"))
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("The Smiths"))
        householdId = household.id
        memberRepository.save(HouseholdMember(householdId = householdId, userId = member.id, role = "member"))
    }

    @Test
    fun `any member can create a list and add items`() {
        val list = shoppingListService.createList(householdId, member.id, CreateShoppingListRequest("Groceries"))

        val item = shoppingListService.addItem(
            list.id, householdId, member.id,
            CreateShoppingItemRequest("Milk", quantity = "2L", category = "Dairy")
        )

        assertEquals("Milk", item.name)
        assertFalse(item.checked)
        val items = shoppingListService.listItems(list.id, householdId, owner.id)
        assertEquals(1, items.size)
    }

    @Test
    fun `updateItem toggles checked state`() {
        val list = shoppingListService.createList(householdId, owner.id, CreateShoppingListRequest("Groceries"))
        val item = shoppingListService.addItem(list.id, householdId, owner.id, CreateShoppingItemRequest("Milk"))

        val updated = shoppingListService.updateItem(
            item.id, list.id, householdId, member.id,
            UpdateShoppingItemRequest("Milk", checked = true)
        )

        assertTrue(updated.checked)
    }

    @Test
    fun `createList fails for non-member`() {
        assertThrows<ShoppingListException> {
            shoppingListService.createList(householdId, outsider.id, CreateShoppingListRequest("Groceries"))
        }
    }

    @Test
    fun `cross-household list access is denied`() {
        val otherHousehold = householdService.createHousehold(outsider, CreateHouseholdRequest("Other House"))
        val list = shoppingListService.createList(householdId, owner.id, CreateShoppingListRequest("Groceries"))

        assertThrows<ShoppingListException> {
            shoppingListService.listItems(list.id, otherHousehold.id, outsider.id)
        }
    }

    @Test
    fun `renameList changes the list name`() {
        val list = shoppingListService.createList(householdId, owner.id, CreateShoppingListRequest("Groceries"))

        val renamed = shoppingListService.renameList(list.id, householdId, member.id, RenameShoppingListRequest("Weekly Groceries"))

        assertEquals("Weekly Groceries", renamed.name)
    }

    @Test
    fun `renameList fails for non-member`() {
        val list = shoppingListService.createList(householdId, owner.id, CreateShoppingListRequest("Groceries"))

        assertThrows<ShoppingListException> {
            shoppingListService.renameList(list.id, householdId, outsider.id, RenameShoppingListRequest("Hijacked"))
        }
    }

    @Test
    fun `renameList denies cross-household access`() {
        val otherHousehold = householdService.createHousehold(outsider, CreateHouseholdRequest("Other House"))
        val list = shoppingListService.createList(householdId, owner.id, CreateShoppingListRequest("Groceries"))

        assertThrows<ShoppingListException> {
            shoppingListService.renameList(list.id, otherHousehold.id, outsider.id, RenameShoppingListRequest("Hijacked"))
        }
    }

    @Test
    fun `deleteItem removes the item from the list`() {
        val list = shoppingListService.createList(householdId, owner.id, CreateShoppingListRequest("Groceries"))
        val item = shoppingListService.addItem(list.id, householdId, owner.id, CreateShoppingItemRequest("Milk"))

        shoppingListService.deleteItem(item.id, list.id, householdId, member.id)

        assertEquals(0, shoppingListService.listItems(list.id, householdId, owner.id).size)
    }
}
