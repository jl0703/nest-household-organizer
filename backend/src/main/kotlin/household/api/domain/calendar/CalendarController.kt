package household.api.domain.calendar

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
import java.time.OffsetDateTime
import java.util.UUID

@Serdeable
data class EventBody(
    @field:NotBlank @field:Size(max = 200) val title: String,
    val description: String? = null,
    val allDay: Boolean = false,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val recurrenceFrequency: String = "none",
    val recurrenceInterval: Int = 1,
    val recurrenceEndDate: LocalDate? = null,
)

@Serdeable
data class ModifyOccurrenceBody(
    val overrideTitle: String? = null,
    val overrideStartsAt: OffsetDateTime? = null,
    val overrideEndsAt: OffsetDateTime? = null,
)

@Controller("/api/households/{householdId}/events")
@Secured(SecurityRule.IS_AUTHENTICATED)
open class CalendarController(
    private val calendarService: CalendarService,
    private val userService: UserService,
) {
    @Post
    open fun create(authentication: Authentication, householdId: UUID, @Body @Valid body: EventBody): HttpResponse<CalendarEvent> {
        val user = userService.resolveOrCreate(authentication)
        val event = calendarService.createEvent(
            householdId,
            user.id,
            CreateEventRequest(
                title = body.title,
                description = body.description,
                allDay = body.allDay,
                startsAt = body.startsAt,
                endsAt = body.endsAt,
                recurrenceFrequency = body.recurrenceFrequency,
                recurrenceInterval = body.recurrenceInterval,
                recurrenceEndDate = body.recurrenceEndDate,
            )
        )
        return HttpResponse.created(event)
    }

    @Get
    open fun list(authentication: Authentication, householdId: UUID): List<CalendarEvent> {
        val user = userService.resolveOrCreate(authentication)
        return calendarService.listEvents(householdId, user.id)
    }

    @Get("/{eventId}")
    open fun get(authentication: Authentication, householdId: UUID, eventId: UUID): CalendarEvent {
        val user = userService.resolveOrCreate(authentication)
        return calendarService.getEvent(eventId, householdId, user.id)
    }

    @Put("/{eventId}")
    open fun update(authentication: Authentication, householdId: UUID, eventId: UUID, @Body @Valid body: EventBody): CalendarEvent {
        val user = userService.resolveOrCreate(authentication)
        return calendarService.updateEvent(
            eventId,
            householdId,
            user.id,
            UpdateEventRequest(
                title = body.title,
                description = body.description,
                allDay = body.allDay,
                startsAt = body.startsAt,
                endsAt = body.endsAt,
                recurrenceFrequency = body.recurrenceFrequency,
                recurrenceInterval = body.recurrenceInterval,
                recurrenceEndDate = body.recurrenceEndDate,
            )
        )
    }

    @Delete("/{eventId}")
    open fun delete(authentication: Authentication, householdId: UUID, eventId: UUID): HttpResponse<Unit> {
        val user = userService.resolveOrCreate(authentication)
        calendarService.deleteEvent(eventId, householdId, user.id)
        return HttpResponse.noContent()
    }

    @Get("/{eventId}/occurrences")
    open fun listOccurrenceOverrides(authentication: Authentication, householdId: UUID, eventId: UUID): List<EventOccurrenceOverride> {
        val user = userService.resolveOrCreate(authentication)
        return calendarService.listOccurrenceOverrides(eventId, householdId, user.id)
    }

    @Post("/{eventId}/occurrences/{date}/skip")
    open fun skipOccurrence(authentication: Authentication, householdId: UUID, eventId: UUID, date: LocalDate): HttpResponse<EventOccurrenceOverride> {
        val user = userService.resolveOrCreate(authentication)
        return HttpResponse.ok(calendarService.skipOccurrence(eventId, householdId, user.id, date))
    }

    @Post("/{eventId}/occurrences/{date}/modify")
    open fun modifyOccurrence(
        authentication: Authentication,
        householdId: UUID,
        eventId: UUID,
        date: LocalDate,
        @Body @Valid body: ModifyOccurrenceBody,
    ): HttpResponse<EventOccurrenceOverride> {
        val user = userService.resolveOrCreate(authentication)
        return HttpResponse.ok(
            calendarService.modifyOccurrence(
                eventId,
                householdId,
                user.id,
                date,
                ModifyOccurrenceRequest(body.overrideTitle, body.overrideStartsAt, body.overrideEndsAt),
            )
        )
    }
}
