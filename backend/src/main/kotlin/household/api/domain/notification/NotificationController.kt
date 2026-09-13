package household.api.domain.notification

import household.api.domain.user.UserService
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Put
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.rules.SecurityRule
import io.micronaut.serde.annotation.Serdeable
import jakarta.validation.Valid
import java.time.LocalTime
import java.util.UUID

@Serdeable
data class UpdateNotificationPreferenceBody(
    val dailyDigestEnabled: Boolean,
    val eventRemindersEnabled: Boolean,
    val choreRemindersEnabled: Boolean,
    val digestTime: LocalTime,
)

@Controller("/api/households/{householdId}/notification-preferences")
@Secured(SecurityRule.IS_AUTHENTICATED)
open class NotificationController(
    private val preferenceService: NotificationPreferenceService,
    private val userService: UserService,
) {
    @Get
    open fun get(authentication: Authentication, householdId: UUID): NotificationPreference {
        val user = userService.resolveOrCreate(authentication)
        return preferenceService.get(householdId, user.id)
    }

    @Put
    open fun update(
        authentication: Authentication,
        householdId: UUID,
        @Body @Valid body: UpdateNotificationPreferenceBody,
    ): NotificationPreference {
        val user = userService.resolveOrCreate(authentication)
        return preferenceService.update(
            householdId,
            user.id,
            UpdateNotificationPreferenceRequest(
                body.dailyDigestEnabled,
                body.eventRemindersEnabled,
                body.choreRemindersEnabled,
                body.digestTime,
            ),
        )
    }
}
