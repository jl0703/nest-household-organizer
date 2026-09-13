package household.api.domain.chore

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
import java.time.LocalDate
import java.util.UUID

@Serdeable
data class ChoreBody(
    @field:NotBlank @field:Size(max = 200) val title: String,
    @field:NotBlank val assigneeType: String,
    val assigneeUserId: UUID? = null,
    val assigneeChildId: UUID? = null,
    val firstDueDate: LocalDate,
    val recurrenceFrequency: String = "none",
    val recurrenceInterval: Int = 1,
    val recurrenceEndDate: LocalDate? = null,
)

@Serdeable
data class UpdateChoreBody(
    @field:NotBlank @field:Size(max = 200) val title: String,
    @field:NotBlank val assigneeType: String,
    val assigneeUserId: UUID? = null,
    val assigneeChildId: UUID? = null,
    val recurrenceFrequency: String = "none",
    val recurrenceInterval: Int = 1,
    val recurrenceEndDate: LocalDate? = null,
)

@Controller("/api/households/{householdId}/chores")
@Secured(SecurityRule.IS_AUTHENTICATED)
open class ChoreController(
    private val choreService: ChoreService,
    private val userService: UserService,
) {
    @Post
    open fun create(authentication: Authentication, householdId: UUID, @Body @Valid body: ChoreBody): HttpResponse<Chore> {
        val user = userService.resolveOrCreate(authentication)
        val chore = choreService.createChore(
            householdId,
            user.id,
            CreateChoreRequest(
                title = body.title,
                assigneeType = body.assigneeType,
                assigneeUserId = body.assigneeUserId,
                assigneeChildId = body.assigneeChildId,
                firstDueDate = body.firstDueDate,
                recurrenceFrequency = body.recurrenceFrequency,
                recurrenceInterval = body.recurrenceInterval,
                recurrenceEndDate = body.recurrenceEndDate,
            )
        )
        return HttpResponse.created(chore)
    }

    @Get
    open fun list(authentication: Authentication, householdId: UUID): List<Chore> {
        val user = userService.resolveOrCreate(authentication)
        return choreService.listChores(householdId, user.id)
    }

    @Put("/{choreId}")
    open fun update(authentication: Authentication, householdId: UUID, choreId: UUID, @Body @Valid body: UpdateChoreBody): Chore {
        val user = userService.resolveOrCreate(authentication)
        return choreService.updateChore(
            choreId,
            householdId,
            user.id,
            UpdateChoreRequest(
                title = body.title,
                assigneeType = body.assigneeType,
                assigneeUserId = body.assigneeUserId,
                assigneeChildId = body.assigneeChildId,
                recurrenceFrequency = body.recurrenceFrequency,
                recurrenceInterval = body.recurrenceInterval,
                recurrenceEndDate = body.recurrenceEndDate,
            )
        )
    }

    @Get("/{choreId}/occurrences")
    open fun listOccurrences(authentication: Authentication, householdId: UUID, choreId: UUID): List<ChoreOccurrence> {
        val user = userService.resolveOrCreate(authentication)
        return choreService.listOccurrences(choreId, householdId, user.id)
    }

    @Delete("/{choreId}")
    open fun delete(authentication: Authentication, householdId: UUID, choreId: UUID): HttpResponse<Unit> {
        val user = userService.resolveOrCreate(authentication)
        choreService.deleteChore(choreId, householdId, user.id)
        return HttpResponse.noContent()
    }

    @Post("/occurrences/{occurrenceId}/complete")
    open fun completeOccurrence(authentication: Authentication, householdId: UUID, occurrenceId: UUID): HttpResponse<ChoreOccurrence> {
        val user = userService.resolveOrCreate(authentication)
        return HttpResponse.ok(choreService.completeOccurrence(occurrenceId, householdId, user.id))
    }

    @Post("/occurrences/{occurrenceId}/skip")
    open fun skipOccurrence(authentication: Authentication, householdId: UUID, occurrenceId: UUID): HttpResponse<ChoreOccurrence> {
        val user = userService.resolveOrCreate(authentication)
        return HttpResponse.ok(choreService.skipOccurrence(occurrenceId, householdId, user.id))
    }
}
