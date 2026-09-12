package household.api.domain.household

import household.api.domain.user.UserService
import io.micronaut.http.HttpResponse
import io.micronaut.http.annotation.*
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.rules.SecurityRule
import io.micronaut.serde.annotation.Serdeable
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.util.UUID

@Serdeable data class CreateHouseholdBody(@field:NotBlank @field:Size(max = 120) val name: String, val timezone: String = "UTC")
@Serdeable data class InviteBody(@field:Email @field:NotBlank val recipientEmail: String)
@Serdeable data class TransferOwnershipBody(val newOwnerId: UUID)
@Serdeable data class CreateChildProfileBody(@field:NotBlank @field:Size(max = 80) val displayName: String)

@Controller("/api")
@Secured(SecurityRule.IS_AUTHENTICATED)
open class HouseholdController(
    private val householdService: HouseholdService,
    private val userService: UserService,
) {
    @Post("/households")
    open fun create(authentication: Authentication, @Body @Valid body: CreateHouseholdBody): HttpResponse<Household> {
        val user = userService.resolveOrCreate(authentication)
        return HttpResponse.created(householdService.createHousehold(user, CreateHouseholdRequest(body.name, body.timezone)))
    }

    @Get("/households")
    open fun list(authentication: Authentication): List<Household> {
        val user = userService.resolveOrCreate(authentication)
        return householdService.listHouseholdsForUser(user.id)
    }

    @Get("/households/{householdId}")
    open fun get(authentication: Authentication, householdId: UUID): Household {
        val user = userService.resolveOrCreate(authentication)
        return householdService.getHousehold(householdId, user.id)
    }

    @Get("/households/{householdId}/members")
    open fun listMembers(authentication: Authentication, householdId: UUID): List<HouseholdMember> {
        val user = userService.resolveOrCreate(authentication)
        return householdService.listMembers(householdId, user.id)
    }

    @Delete("/households/{householdId}/members/{targetUserId}")
    open fun removeMember(authentication: Authentication, householdId: UUID, targetUserId: UUID): HttpResponse<Unit> {
        val user = userService.resolveOrCreate(authentication)
        householdService.removeMember(householdId, targetUserId, user.id)
        return HttpResponse.noContent()
    }

    @Post("/households/{householdId}/transfer-ownership")
    open fun transferOwnership(authentication: Authentication, householdId: UUID, @Body @Valid body: TransferOwnershipBody): HttpResponse<Unit> {
        val user = userService.resolveOrCreate(authentication)
        householdService.transferOwnership(householdId, user.id, TransferOwnershipRequest(body.newOwnerId))
        return HttpResponse.ok()
    }

    @Post("/households/{householdId}/invitations")
    open fun invite(authentication: Authentication, householdId: UUID, @Body @Valid body: InviteBody): HttpResponse<Invitation> {
        val user = userService.resolveOrCreate(authentication)
        return HttpResponse.created(householdService.inviteMember(householdId, user.id, InviteRequest(body.recipientEmail)))
    }

    @Post("/invitations/{token}/accept")
    open fun acceptInvitation(authentication: Authentication, token: String): HttpResponse<HouseholdMember> {
        val user = userService.resolveOrCreate(authentication)
        return HttpResponse.ok(householdService.acceptInvitation(token, user))
    }

    @Delete("/households/{householdId}/invitations/{invitationId}")
    open fun revokeInvitation(authentication: Authentication, householdId: UUID, invitationId: UUID): HttpResponse<Unit> {
        val user = userService.resolveOrCreate(authentication)
        householdService.revokeInvitation(invitationId, user.id)
        return HttpResponse.noContent()
    }

    @Post("/households/{householdId}/children")
    open fun createChild(authentication: Authentication, householdId: UUID, @Body @Valid body: CreateChildProfileBody): HttpResponse<ChildProfile> {
        val user = userService.resolveOrCreate(authentication)
        return HttpResponse.created(householdService.createChildProfile(householdId, user.id, CreateChildProfileRequest(body.displayName)))
    }

    @Get("/households/{householdId}/children")
    open fun listChildren(authentication: Authentication, householdId: UUID): List<ChildProfile> {
        val user = userService.resolveOrCreate(authentication)
        return householdService.listChildProfiles(householdId, user.id)
    }

    @Delete("/households/{householdId}/children/{childId}")
    open fun deleteChild(authentication: Authentication, householdId: UUID, childId: UUID): HttpResponse<Unit> {
        val user = userService.resolveOrCreate(authentication)
        householdService.deleteChildProfile(childId, householdId, user.id)
        return HttpResponse.noContent()
    }
}
