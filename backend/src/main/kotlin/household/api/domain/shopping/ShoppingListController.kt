package household.api.domain.shopping

import household.api.domain.user.UserService
import io.micronaut.http.HttpResponse
import io.micronaut.http.annotation.*
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.rules.SecurityRule
import io.micronaut.serde.annotation.Serdeable
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.util.UUID

@Serdeable data class ShoppingListBody(@field:NotBlank @field:Size(max = 120) val name: String)

@Serdeable
data class ShoppingItemBody(
    @field:NotBlank @field:Size(max = 200) val name: String,
    val quantity: String? = null,
    val category: String? = null,
)

@Serdeable
data class UpdateShoppingItemBody(
    @field:NotBlank @field:Size(max = 200) val name: String,
    val quantity: String? = null,
    val category: String? = null,
    val checked: Boolean = false,
)

@Controller("/api/households/{householdId}/shopping-lists")
@Secured(SecurityRule.IS_AUTHENTICATED)
open class ShoppingListController(
    private val shoppingListService: ShoppingListService,
    private val userService: UserService,
) {
    @Post
    open fun create(authentication: Authentication, householdId: UUID, @Body @Valid body: ShoppingListBody): HttpResponse<ShoppingList> {
        val user = userService.resolveOrCreate(authentication)
        return HttpResponse.created(shoppingListService.createList(householdId, user.id, CreateShoppingListRequest(body.name)))
    }

    @Get
    open fun list(authentication: Authentication, householdId: UUID): List<ShoppingList> {
        val user = userService.resolveOrCreate(authentication)
        return shoppingListService.listLists(householdId, user.id)
    }

    @Put("/{listId}")
    open fun rename(authentication: Authentication, householdId: UUID, listId: UUID, @Body @Valid body: ShoppingListBody): ShoppingList {
        val user = userService.resolveOrCreate(authentication)
        return shoppingListService.renameList(listId, householdId, user.id, RenameShoppingListRequest(body.name))
    }

    @Delete("/{listId}")
    open fun delete(authentication: Authentication, householdId: UUID, listId: UUID): HttpResponse<Unit> {
        val user = userService.resolveOrCreate(authentication)
        shoppingListService.deleteList(listId, householdId, user.id)
        return HttpResponse.noContent()
    }

    @Post("/{listId}/items")
    open fun addItem(authentication: Authentication, householdId: UUID, listId: UUID, @Body @Valid body: ShoppingItemBody): HttpResponse<ShoppingItem> {
        val user = userService.resolveOrCreate(authentication)
        val item = shoppingListService.addItem(
            listId, householdId, user.id,
            CreateShoppingItemRequest(body.name, body.quantity, body.category)
        )
        return HttpResponse.created(item)
    }

    @Get("/{listId}/items")
    open fun listItems(authentication: Authentication, householdId: UUID, listId: UUID): List<ShoppingItem> {
        val user = userService.resolveOrCreate(authentication)
        return shoppingListService.listItems(listId, householdId, user.id)
    }

    @Put("/{listId}/items/{itemId}")
    open fun updateItem(
        authentication: Authentication,
        householdId: UUID,
        listId: UUID,
        itemId: UUID,
        @Body @Valid body: UpdateShoppingItemBody,
    ): ShoppingItem {
        val user = userService.resolveOrCreate(authentication)
        return shoppingListService.updateItem(
            itemId, listId, householdId, user.id,
            UpdateShoppingItemRequest(body.name, body.quantity, body.category, body.checked)
        )
    }

    @Delete("/{listId}/items/{itemId}")
    open fun deleteItem(authentication: Authentication, householdId: UUID, listId: UUID, itemId: UUID): HttpResponse<Unit> {
        val user = userService.resolveOrCreate(authentication)
        shoppingListService.deleteItem(itemId, listId, householdId, user.id)
        return HttpResponse.noContent()
    }
}
