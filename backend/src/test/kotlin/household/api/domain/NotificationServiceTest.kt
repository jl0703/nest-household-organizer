package household.api.domain

import household.api.domain.calendar.CalendarService
import household.api.domain.calendar.CreateEventRequest
import household.api.domain.calendar.ModifyOccurrenceRequest
import household.api.domain.chore.ChoreService
import household.api.domain.chore.CreateChoreRequest
import household.api.domain.household.CreateChildProfileRequest
import household.api.domain.household.CreateHouseholdRequest
import household.api.domain.household.HouseholdMember
import household.api.domain.household.HouseholdMemberRepository
import household.api.domain.household.HouseholdService
import household.api.domain.notification.NotificationException
import household.api.domain.notification.NotificationJobRepository
import household.api.domain.notification.NotificationPreferenceService
import household.api.domain.notification.NotificationScanCoordinator
import household.api.domain.notification.NotificationSchedulerStateRepository
import household.api.domain.notification.NotificationSchedulingService
import household.api.domain.notification.UpdateNotificationPreferenceRequest
import household.api.domain.user.User
import household.api.domain.user.UserRepository
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDate
import java.time.LocalTime
import java.time.OffsetDateTime
import java.util.UUID

@MicronautTest
class NotificationServiceTest {
    @Inject lateinit var preferenceService: NotificationPreferenceService
    @Inject lateinit var schedulingService: NotificationSchedulingService
    @Inject lateinit var scanCoordinator: NotificationScanCoordinator
    @Inject lateinit var schedulerStateRepository: NotificationSchedulerStateRepository
    @Inject lateinit var jobRepository: NotificationJobRepository
    @Inject lateinit var householdService: HouseholdService
    @Inject lateinit var memberRepository: HouseholdMemberRepository
    @Inject lateinit var userRepository: UserRepository
    @Inject lateinit var calendarService: CalendarService
    @Inject lateinit var choreService: ChoreService

    private fun user(label: String) = userRepository.save(
        User(supabaseUid = UUID.randomUUID().toString(), email = "$label-${UUID.randomUUID()}@test.com", displayName = label)
    )

    @Test
    fun `preferences default to enabled at eight and only members may access them`() {
        val owner = user("owner")
        val outsider = user("outsider")
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("Home", "America/New_York"))

        val preference = preferenceService.get(household.id, owner.id)

        assertTrue(preference.dailyDigestEnabled)
        assertTrue(preference.eventRemindersEnabled)
        assertTrue(preference.choreRemindersEnabled)
        assertEquals(LocalTime.of(8, 0), preference.digestTime)
        assertThrows<NotificationException> { preferenceService.get(household.id, outsider.id) }
        assertThrows<NotificationException> {
            preferenceService.update(
                household.id,
                owner.id,
                UpdateNotificationPreferenceRequest(true, true, true, LocalTime.of(8, 0, 1)),
            )
        }
    }

    @Test
    fun `members update only their own preferences`() {
        val owner = user("owner")
        val member = user("member")
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("Home"))
        memberRepository.save(HouseholdMember(householdId = household.id, userId = member.id))

        val updated = preferenceService.update(
            household.id,
            member.id,
            UpdateNotificationPreferenceRequest(false, true, false, LocalTime.of(9, 30)),
        )

        assertFalse(updated.dailyDigestEnabled)
        assertTrue(updated.eventRemindersEnabled)
        assertFalse(updated.choreRemindersEnabled)
        assertEquals(LocalTime.of(9, 30), updated.digestTime)
        assertEquals(LocalTime.of(8, 0), preferenceService.get(household.id, owner.id).digestTime)
    }

    @Test
    fun `digest jobs use household timezone and duplicate scans remain idempotent`() {
        val owner = user("owner")
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("Home", "America/New_York"))
        preferenceService.get(household.id, owner.id)
        val from = OffsetDateTime.parse("2026-01-15T12:59:00Z")
        val until = OffsetDateTime.parse("2026-01-15T13:01:00Z")

        schedulingService.queueDueJobs(from, until)
        schedulingService.queueDueJobs(from, until)

        val jobs = jobRepository.findByHouseholdId(household.id)
        assertEquals(1, jobs.size)
        assertEquals("daily_digest", jobs.single().type)
        assertEquals(OffsetDateTime.parse("2026-01-15T13:00:00Z").toInstant(), jobs.single().scheduledFor.toInstant())
    }

    @Test
    fun `coordinator resumes from the previous boundary when scheduler runs late`() {
        val owner = user("owner")
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("Home", "UTC"))
        preferenceService.update(
            household.id,
            owner.id,
            UpdateNotificationPreferenceRequest(false, true, false, LocalTime.of(8, 0)),
        )
        val stateId = UUID.randomUUID().toString()
        scanCoordinator.queueDueJobs(OffsetDateTime.parse("2040-01-01T12:00:00Z"), stateId)
        val event = calendarService.createEvent(
            household.id,
            owner.id,
            CreateEventRequest(
                title = "Appointment",
                startsAt = OffsetDateTime.parse("2040-01-01T12:05:00Z"),
                endsAt = OffsetDateTime.parse("2040-01-01T13:00:00Z"),
            ),
        )

        scanCoordinator.queueDueJobs(OffsetDateTime.parse("2040-01-01T12:10:00Z"), stateId)

        val job = jobRepository.findByHouseholdId(household.id).single()
        assertEquals(event.id, job.sourceId)
        assertEquals(OffsetDateTime.parse("2040-01-01T12:05:00Z").toInstant(), job.scheduledFor.toInstant())
    }

    @Test
    fun `coordinator rescans lookahead work committed after the previous run`() {
        val owner = user("owner")
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("Home", "UTC"))
        preferenceService.update(
            household.id,
            owner.id,
            UpdateNotificationPreferenceRequest(false, true, false, LocalTime.of(8, 0)),
        )
        val stateId = UUID.randomUUID().toString()
        scanCoordinator.queueDueJobs(OffsetDateTime.parse("2050-01-01T12:00:00Z"), stateId)
        val event = calendarService.createEvent(
            household.id,
            owner.id,
            CreateEventRequest(
                title = "Last-minute appointment",
                startsAt = OffsetDateTime.parse("2050-01-01T12:00:45Z"),
                endsAt = OffsetDateTime.parse("2050-01-01T13:00:00Z"),
            ),
        )

        scanCoordinator.queueDueJobs(OffsetDateTime.parse("2050-01-01T12:02:00Z"), stateId)

        val job = jobRepository.findByHouseholdId(household.id).single()
        assertEquals(event.id, job.sourceId)
    }

    @Test
    fun `scheduler state advancement is monotonic`() {
        val stateId = UUID.randomUUID().toString()
        val initial = OffsetDateTime.parse("2060-01-01T12:00:00Z")
        scanCoordinator.queueDueJobs(initial, stateId)

        schedulerStateRepository.advanceLastScannedAt(stateId, initial.plusMinutes(10))
        schedulerStateRepository.advanceLastScannedAt(stateId, initial.plusMinutes(5))

        assertEquals(
            initial.plusMinutes(10).toInstant(),
            schedulerStateRepository.findById(stateId).orElseThrow().lastScannedAt.toInstant(),
        )
    }

    @Test
    fun `event jobs honor modified and skipped recurring occurrences`() {
        val owner = user("owner")
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("Home", "UTC"))
        preferenceService.update(
            household.id,
            owner.id,
            UpdateNotificationPreferenceRequest(false, true, false, LocalTime.of(8, 0)),
        )
        val modified = calendarService.createEvent(
            household.id,
            owner.id,
            CreateEventRequest(
                title = "Dentist",
                startsAt = OffsetDateTime.parse("2026-01-01T10:00:00Z"),
                endsAt = OffsetDateTime.parse("2026-01-01T11:00:00Z"),
                recurrenceFrequency = "weekly",
            ),
        )
        calendarService.modifyOccurrence(
            modified.id,
            household.id,
            owner.id,
            LocalDate.of(2026, 1, 8),
            ModifyOccurrenceRequest(overrideStartsAt = OffsetDateTime.parse("2026-01-08T12:00:00Z")),
        )
        val skipped = calendarService.createEvent(
            household.id,
            owner.id,
            CreateEventRequest(
                title = "School",
                startsAt = OffsetDateTime.parse("2026-01-01T12:00:00Z"),
                endsAt = OffsetDateTime.parse("2026-01-01T13:00:00Z"),
                recurrenceFrequency = "weekly",
            ),
        )
        calendarService.skipOccurrence(skipped.id, household.id, owner.id, LocalDate.of(2026, 1, 8))

        schedulingService.queueDueJobs(
            OffsetDateTime.parse("2026-01-08T11:59:00Z"),
            OffsetDateTime.parse("2026-01-08T12:01:00Z"),
        )

        val jobs = jobRepository.findByHouseholdId(household.id)
        assertEquals(1, jobs.size)
        assertEquals(modified.id, jobs.single().sourceId)
        assertEquals("2026-01-08", jobs.single().occurrenceKey)
    }

    @Test
    fun `recurring event reminders retain household local time across daylight saving changes`() {
        val owner = user("owner")
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("Home", "America/New_York"))
        preferenceService.update(
            household.id,
            owner.id,
            UpdateNotificationPreferenceRequest(false, true, false, LocalTime.of(8, 0)),
        )
        val event = calendarService.createEvent(
            household.id,
            owner.id,
            CreateEventRequest(
                title = "Weekly meeting",
                startsAt = OffsetDateTime.parse("2026-03-01T09:00:00-05:00"),
                endsAt = OffsetDateTime.parse("2026-03-01T10:00:00-05:00"),
                recurrenceFrequency = "weekly",
            ),
        )

        schedulingService.queueDueJobs(
            OffsetDateTime.parse("2026-03-08T12:59:00Z"),
            OffsetDateTime.parse("2026-03-08T13:01:00Z"),
        )

        val job = jobRepository.findByHouseholdId(household.id).single()
        assertEquals(event.id, job.sourceId)
        assertEquals(OffsetDateTime.parse("2026-03-08T13:00:00Z").toInstant(), job.scheduledFor.toInstant())
    }

    @Test
    fun `chore jobs notify adult assignees and creators of child chores at recipient digest time`() {
        val owner = user("owner")
        val member = user("member")
        val household = householdService.createHousehold(owner, CreateHouseholdRequest("Home", "America/New_York"))
        memberRepository.save(HouseholdMember(householdId = household.id, userId = member.id))
        preferenceService.update(
            household.id,
            owner.id,
            UpdateNotificationPreferenceRequest(false, false, true, LocalTime.of(8, 0)),
        )
        preferenceService.update(
            household.id,
            member.id,
            UpdateNotificationPreferenceRequest(false, false, true, LocalTime.of(9, 0)),
        )
        choreService.createChore(
            household.id,
            owner.id,
            CreateChoreRequest("Laundry", "adult", assigneeUserId = member.id, firstDueDate = LocalDate.of(2026, 1, 15)),
        )
        val child = householdService.createChildProfile(household.id, owner.id, CreateChildProfileRequest("Child"))
        choreService.createChore(
            household.id,
            owner.id,
            CreateChoreRequest("Tidy room", "child", assigneeChildId = child.id, firstDueDate = LocalDate.of(2026, 1, 15)),
        )

        schedulingService.queueDueJobs(
            OffsetDateTime.parse("2026-01-15T12:59:00Z"),
            OffsetDateTime.parse("2026-01-15T14:01:00Z"),
        )

        val jobs = jobRepository.findByHouseholdId(household.id).sortedBy { it.scheduledFor }
        assertEquals(2, jobs.size)
        assertEquals(owner.id, jobs[0].recipientUserId)
        assertEquals(OffsetDateTime.parse("2026-01-15T13:00:00Z").toInstant(), jobs[0].scheduledFor.toInstant())
        assertEquals(member.id, jobs[1].recipientUserId)
        assertEquals(OffsetDateTime.parse("2026-01-15T14:00:00Z").toInstant(), jobs[1].scheduledFor.toInstant())
    }
}
