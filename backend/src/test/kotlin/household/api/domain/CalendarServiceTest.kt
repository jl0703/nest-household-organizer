package household.api.domain

import household.api.domain.calendar.*
import household.api.domain.household.CreateHouseholdRequest
import household.api.domain.household.HouseholdMember
import household.api.domain.household.HouseholdMemberRepository
import household.api.domain.household.HouseholdService
import household.api.domain.user.User
import household.api.domain.user.UserRepository
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@MicronautTest
class CalendarServiceTest {

    @Inject lateinit var calendarService: CalendarService
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

    private fun baseRequest(
        frequency: String = "none",
        interval: Int = 1,
        endDate: LocalDate? = null,
    ) = CreateEventRequest(
        title = "Dentist",
        startsAt = OffsetDateTime.parse("2026-01-01T10:00:00Z"),
        endsAt = OffsetDateTime.parse("2026-01-01T11:00:00Z"),
        recurrenceFrequency = frequency,
        recurrenceInterval = interval,
        recurrenceEndDate = endDate,
    )

    @Test
    fun `createEvent works for any member and is visible to all members`() {
        val event = calendarService.createEvent(householdId, member.id, baseRequest())

        assertEquals("Dentist", event.title)
        val eventsForOwner = calendarService.listEvents(householdId, owner.id)
        assertEquals(1, eventsForOwner.size)
    }

    @Test
    fun `createEvent fails for non-member`() {
        assertThrows<CalendarException> {
            calendarService.createEvent(householdId, outsider.id, baseRequest())
        }
    }

    @Test
    fun `getEvent denies cross-household access`() {
        val otherHousehold = householdService.createHousehold(outsider, CreateHouseholdRequest("Other House"))
        val event = calendarService.createEvent(householdId, owner.id, baseRequest())

        assertThrows<CalendarException> {
            calendarService.getEvent(event.id, otherHousehold.id, outsider.id)
        }
    }

    @Test
    fun `updateEvent allows any member to edit`() {
        val event = calendarService.createEvent(householdId, owner.id, baseRequest())

        val updated = calendarService.updateEvent(
            event.id,
            householdId,
            member.id,
            UpdateEventRequest(
                title = "Dentist - rescheduled",
                startsAt = event.startsAt,
                endsAt = event.endsAt,
            )
        )

        assertEquals("Dentist - rescheduled", updated.title)
    }

    @Test
    fun `skipOccurrence creates a skip override without touching the parent series`() {
        val event = calendarService.createEvent(householdId, owner.id, baseRequest(frequency = "weekly"))

        val override = calendarService.skipOccurrence(event.id, householdId, member.id, LocalDate.of(2026, 1, 8))

        assertEquals("skipped", override.status)
        val fetchedEvent = calendarService.getEvent(event.id, householdId, owner.id)
        assertEquals("weekly", fetchedEvent.recurrenceFrequency)
        val overrides = calendarService.listOccurrenceOverrides(event.id, householdId, owner.id)
        assertEquals(1, overrides.size)
    }

    @Test
    fun `skipOccurrence fails for non-recurring events`() {
        val event = calendarService.createEvent(householdId, owner.id, baseRequest())

        assertThrows<CalendarException> {
            calendarService.skipOccurrence(event.id, householdId, owner.id, LocalDate.of(2026, 1, 1))
        }
    }

    @Test
    fun `modifyOccurrence overrides a single occurrence`() {
        val event = calendarService.createEvent(householdId, owner.id, baseRequest(frequency = "weekly"))

        val override = calendarService.modifyOccurrence(
            event.id,
            householdId,
            owner.id,
            LocalDate.of(2026, 1, 8),
            ModifyOccurrenceRequest(overrideTitle = "Dentist - moved to evening"),
        )

        assertEquals("modified", override.status)
        assertEquals("Dentist - moved to evening", override.overrideTitle)
    }

    @Test
    fun `modifyOccurrence replaces an existing override for the same date`() {
        val event = calendarService.createEvent(householdId, owner.id, baseRequest(frequency = "weekly"))
        calendarService.skipOccurrence(event.id, householdId, owner.id, LocalDate.of(2026, 1, 8))

        val override = calendarService.modifyOccurrence(
            event.id,
            householdId,
            owner.id,
            LocalDate.of(2026, 1, 8),
            ModifyOccurrenceRequest(overrideTitle = "Dentist - moved"),
        )

        val overrides = calendarService.listOccurrenceOverrides(event.id, householdId, owner.id)
        assertEquals(1, overrides.size)
        assertEquals("modified", override.status)
    }

    @Test
    fun `deleteEvent removes the event`() {
        val event = calendarService.createEvent(householdId, owner.id, baseRequest())

        calendarService.deleteEvent(event.id, householdId, owner.id)

        assertThrows<CalendarException> {
            calendarService.getEvent(event.id, householdId, owner.id)
        }
    }
}
