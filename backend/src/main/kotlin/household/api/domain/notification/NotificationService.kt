package household.api.domain.notification

import household.api.domain.calendar.CalendarEvent
import household.api.domain.calendar.CalendarEventRepository
import household.api.domain.calendar.EventOccurrenceOverride
import household.api.domain.calendar.EventOccurrenceOverrideRepository
import household.api.domain.chore.ChoreRepository
import household.api.domain.chore.ChoreOccurrenceRepository
import household.api.domain.household.HouseholdException
import household.api.domain.household.HouseholdMemberRepository
import household.api.domain.household.HouseholdRepository
import io.micronaut.data.exceptions.DataAccessException
import jakarta.inject.Singleton
import org.slf4j.LoggerFactory
import java.nio.charset.StandardCharsets
import java.time.DateTimeException
import java.time.LocalDate
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.YearMonth
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.UUID
import kotlin.math.max

private const val DAILY_DIGEST = "daily_digest"
private const val EVENT_DUE = "event_due"
private const val CHORE_DUE = "chore_due"

data class UpdateNotificationPreferenceRequest(
    val dailyDigestEnabled: Boolean,
    val eventRemindersEnabled: Boolean,
    val choreRemindersEnabled: Boolean,
    val digestTime: LocalTime,
)

class NotificationException(message: String) : HouseholdException(message)

@Singleton
open class NotificationPreferenceService(
    private val preferenceRepository: NotificationPreferenceRepository,
    private val memberRepository: HouseholdMemberRepository,
) {
    open fun get(householdId: UUID, userId: UUID): NotificationPreference {
        assertMember(householdId, userId)
        return preferenceRepository.findByHouseholdIdAndUserId(householdId, userId) ?: createDefault(householdId, userId)
    }

    open fun update(
        householdId: UUID,
        userId: UUID,
        request: UpdateNotificationPreferenceRequest,
    ): NotificationPreference {
        if (request.digestTime.second != 0 || request.digestTime.nano != 0) {
            throw NotificationException("Digest time must use minute precision")
        }
        val current = get(householdId, userId)
        return preferenceRepository.update(
            current.copy(
                dailyDigestEnabled = request.dailyDigestEnabled,
                eventRemindersEnabled = request.eventRemindersEnabled,
                choreRemindersEnabled = request.choreRemindersEnabled,
                digestTime = request.digestTime,
            )
        )
    }

    private fun createDefault(householdId: UUID, userId: UUID): NotificationPreference {
        val preference = NotificationPreference(
            id = stableId("preference", householdId, userId),
            householdId = householdId,
            userId = userId,
        )
        return try {
            preferenceRepository.save(preference)
        } catch (exception: DataAccessException) {
            preferenceRepository.findByHouseholdIdAndUserId(householdId, userId) ?: throw exception
        }
    }

    private fun assertMember(householdId: UUID, userId: UUID) {
        memberRepository.findByHouseholdIdAndUserId(householdId, userId)
            ?: throw NotificationException("Not a member of this household")
    }
}

@Singleton
open class NotificationSchedulingService(
    private val preferenceService: NotificationPreferenceService,
    private val jobRepository: NotificationJobRepository,
    private val householdRepository: HouseholdRepository,
    private val memberRepository: HouseholdMemberRepository,
    private val eventRepository: CalendarEventRepository,
    private val overrideRepository: EventOccurrenceOverrideRepository,
    private val choreRepository: ChoreRepository,
    private val choreOccurrenceRepository: ChoreOccurrenceRepository,
) {
    private val log = LoggerFactory.getLogger(NotificationSchedulingService::class.java)

    open fun queueDueJobs(from: OffsetDateTime, until: OffsetDateTime): Int {
        require(until.isAfter(from)) { "Notification scan end must be after start" }
        require(!until.isAfter(from.plusDays(1))) { "Notification scan window must not exceed one day" }
        var queued = 0
        memberRepository.findAll().forEach { member ->
            try {
                val preference = preferenceService.get(member.householdId, member.userId)
                val household = householdRepository.findById(member.householdId).orElse(null) ?: return@forEach
                val zone = ZoneId.of(household.timezone)
                queued += queueForPreference(preference, zone, from, until)
            } catch (_: DateTimeException) {
                log.warn("Skipping notification scheduling for household {} with an invalid timezone", member.householdId)
            }
        }
        return queued
    }

    private fun queueForPreference(
        preference: NotificationPreference,
        zone: ZoneId,
        from: OffsetDateTime,
        until: OffsetDateTime,
    ): Int {
        var queued = 0
        val dates = datesInWindow(zone, from, until)
        if (preference.dailyDigestEnabled) {
            dates.forEach { date ->
                val scheduledFor = date.atTime(preference.digestTime).atZone(zone).toOffsetDateTime()
                if (isInWindow(scheduledFor, from, until) && createJob(
                        preference,
                        DAILY_DIGEST,
                        "household",
                        preference.householdId,
                        date.toString(),
                        scheduledFor,
                    )) queued++
            }
        }
        if (preference.eventRemindersEnabled) queued += queueEventJobs(preference, zone, from, until)
        if (preference.choreRemindersEnabled) queued += queueChoreJobs(preference, zone, dates, from, until)
        return queued
    }

    private fun queueEventJobs(
        preference: NotificationPreference,
        zone: ZoneId,
        from: OffsetDateTime,
        until: OffsetDateTime,
    ): Int {
        var queued = 0
        val fromDate = from.toInstant().atZone(zone).toLocalDate()
        val untilDate = until.minusNanos(1).toInstant().atZone(zone).toLocalDate()
        eventRepository.findForNotificationWindow(preference.householdId, from, until, fromDate).forEach { event ->
            val overrides = overrideRepository.findForNotificationWindow(event.id, fromDate, untilDate, from, until)
            eventOccurrences(event, overrides, zone, from, until).forEach { occurrence ->
                if (createJob(
                        preference,
                        EVENT_DUE,
                        "calendar_event",
                        event.id,
                        occurrence.key,
                        occurrence.scheduledFor,
                    )) queued++
            }
        }
        return queued
    }

    private fun queueChoreJobs(
        preference: NotificationPreference,
        zone: ZoneId,
        dates: List<LocalDate>,
        from: OffsetDateTime,
        until: OffsetDateTime,
    ): Int {
        var queued = 0
        val fromDate = dates.first()
        val untilDate = dates.last()
        choreRepository.findForNotificationWindow(preference.householdId, fromDate, untilDate).forEach { chore ->
            val recipientId = if (chore.assigneeType == "adult") chore.assigneeUserId else chore.createdBy
            if (recipientId != preference.userId) return@forEach
            choreOccurrenceRepository.findByChoreIdAndStatusAndDueDateBetween(chore.id, "pending", fromDate, untilDate)
                .forEach { occurrence ->
                    val scheduledFor = occurrence.dueDate.atTime(preference.digestTime).atZone(zone).toOffsetDateTime()
                    if (isInWindow(scheduledFor, from, until) && createJob(
                            preference,
                            CHORE_DUE,
                            "chore",
                            chore.id,
                            occurrence.dueDate.toString(),
                            scheduledFor,
                        )) queued++
                }
        }
        return queued
    }

    private fun createJob(
        preference: NotificationPreference,
        type: String,
        sourceType: String,
        sourceId: UUID,
        occurrenceKey: String,
        scheduledFor: OffsetDateTime,
    ): Boolean {
        val id = stableId(
            "job",
            preference.userId,
            type,
            sourceType,
            sourceId,
            occurrenceKey,
            scheduledFor.toInstant(),
        )
        if (jobRepository.existsById(id)) return false
        val job = NotificationJob(
            id = id,
            householdId = preference.householdId,
            recipientUserId = preference.userId,
            type = type,
            sourceType = sourceType,
            sourceId = sourceId,
            occurrenceKey = occurrenceKey,
            scheduledFor = scheduledFor,
        )
        return try {
            jobRepository.save(job)
            true
        } catch (exception: DataAccessException) {
            if (jobRepository.existsById(id)) false else throw exception
        }
    }

    private fun eventOccurrences(
        event: CalendarEvent,
        overrides: List<EventOccurrenceOverride>,
        zone: ZoneId,
        from: OffsetDateTime,
        until: OffsetDateTime,
    ): List<ScheduledOccurrence> {
        if (event.recurrenceFrequency == "none") {
            return if (isInWindow(event.startsAt, from, until)) {
                val occurrenceDate = event.startsAt.toInstant().atZone(zone).toLocalDate()
                listOf(ScheduledOccurrence(occurrenceDate.toString(), event.startsAt))
            } else emptyList()
        }
        val byDate = overrides.associateBy { it.occurrenceDate }
        val occurrences = linkedMapOf<String, ScheduledOccurrence>()
        var index = initialOccurrenceIndex(event, zone, from)
        var startsAt = occurrenceAt(event, zone, index)
        while (startsAt.isBefore(from)) {
            index++
            startsAt = occurrenceAt(event, zone, index)
        }
        while (startsAt.isBefore(until) && !pastRecurrenceEnd(event, startsAt.toInstant().atZone(zone).toLocalDate())) {
            val date = startsAt.toInstant().atZone(zone).toLocalDate()
            val override = byDate[date]
            val effective = override?.overrideStartsAt ?: startsAt
            if (override?.status != "skipped" && isInWindow(effective, from, until)) {
                occurrences[date.toString()] = ScheduledOccurrence(date.toString(), effective)
            }
            index++
            startsAt = occurrenceAt(event, zone, index)
        }
        overrides.filter { it.status == "modified" && it.overrideStartsAt != null }.forEach { override ->
            val effective = override.overrideStartsAt!!
            if (isInWindow(effective, from, until)) {
                occurrences[override.occurrenceDate.toString()] = ScheduledOccurrence(override.occurrenceDate.toString(), effective)
            }
        }
        return occurrences.values.toList()
    }

    private fun initialOccurrenceIndex(event: CalendarEvent, zone: ZoneId, from: OffsetDateTime): Long {
        if (!event.startsAt.isBefore(from)) return 0
        val startsAt = event.startsAt.toInstant().atZone(zone)
        val targetDate = from.toInstant().atZone(zone).toLocalDate()
        val units = when (event.recurrenceFrequency) {
            "daily" -> ChronoUnit.DAYS.between(startsAt.toLocalDate(), targetDate)
            "weekly" -> ChronoUnit.WEEKS.between(startsAt.toLocalDate(), targetDate)
            "monthly" -> ChronoUnit.MONTHS.between(YearMonth.from(startsAt), YearMonth.from(targetDate))
            "yearly" -> ChronoUnit.YEARS.between(startsAt.toLocalDate(), targetDate)
            else -> 0
        }
        return max(0, units / event.recurrenceInterval)
    }

    private fun occurrenceAt(event: CalendarEvent, zone: ZoneId, index: Long): OffsetDateTime {
        val startsAt = event.startsAt.toInstant().atZone(zone)
        val amount = index * event.recurrenceInterval
        return when (event.recurrenceFrequency) {
            "daily" -> startsAt.plusDays(amount)
            "weekly" -> startsAt.plusWeeks(amount)
            "monthly" -> startsAt.plusMonths(amount)
            "yearly" -> startsAt.plusYears(amount)
            else -> startsAt
        }.toOffsetDateTime()
    }

    private fun pastRecurrenceEnd(event: CalendarEvent, date: LocalDate): Boolean =
        event.recurrenceEndDate?.let(date::isAfter) ?: false

    private fun datesInWindow(zone: ZoneId, from: OffsetDateTime, until: OffsetDateTime): List<LocalDate> {
        val first = from.toInstant().atZone(zone).toLocalDate()
        val last = until.minusNanos(1).toInstant().atZone(zone).toLocalDate()
        return generateSequence(first) { it.plusDays(1) }.takeWhile { !it.isAfter(last) }.toList()
    }

    private fun isInWindow(value: OffsetDateTime, from: OffsetDateTime, until: OffsetDateTime): Boolean =
        !value.toInstant().isBefore(from.toInstant()) && value.toInstant().isBefore(until.toInstant())

    private data class ScheduledOccurrence(val key: String, val scheduledFor: OffsetDateTime)
}

private fun stableId(vararg parts: Any): UUID = UUID.nameUUIDFromBytes(
    parts.joinToString("|").toByteArray(StandardCharsets.UTF_8)
)
