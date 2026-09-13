package household.api.domain.notification

import io.micronaut.context.annotation.Requires
import io.micronaut.context.annotation.Value
import io.micronaut.data.exceptions.DataAccessException
import io.micronaut.scheduling.annotation.Scheduled
import jakarta.inject.Singleton
import org.slf4j.LoggerFactory
import java.time.Duration
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Singleton
open class NotificationScanCoordinator(
    private val schedulingService: NotificationSchedulingService,
    private val stateRepository: NotificationSchedulerStateRepository,
    @param:Value("\${notifications.scheduling.recovery-lookback:1h}") private val recoveryLookback: Duration,
    @param:Value("\${notifications.scheduling.lookahead:1m}") private val lookahead: Duration,
) {
    private val log = LoggerFactory.getLogger(NotificationScanCoordinator::class.java)

    open fun queueDueJobs(now: OffsetDateTime, stateId: String = "default"): Int {
        require(!recoveryLookback.isNegative && !recoveryLookback.isZero) { "Recovery lookback must be positive" }
        require(!lookahead.isNegative) { "Notification lookahead must not be negative" }
        val state = getOrCreateState(stateId, now.minus(recoveryLookback))
        var from = state.lastScannedAt
        var totalQueued = 0
        while (from.isBefore(now)) {
            val until = minOf(from.plusDays(1), now)
            val queued = scan(from, until)
            totalQueued += queued
            stateRepository.advanceLastScannedAt(stateId, until)
            from = until
        }
        if (!lookahead.isZero) {
            totalQueued += scan(now, now.plus(lookahead))
        }
        return totalQueued
    }

    private fun scan(from: OffsetDateTime, until: OffsetDateTime): Int = try {
        schedulingService.queueDueJobs(from, until).also { queued ->
            log.info("Notification scan completed from {} until {}; queued {} jobs", from, until, queued)
        }
    } catch (exception: RuntimeException) {
        log.error("Notification scan failed from {} until {}", from, until, exception)
        throw exception
    }

    private fun getOrCreateState(stateId: String, initialLastScannedAt: OffsetDateTime): NotificationSchedulerState {
        stateRepository.findById(stateId).orElse(null)?.let { return it }
        return try {
            stateRepository.save(NotificationSchedulerState(stateId, initialLastScannedAt))
        } catch (exception: DataAccessException) {
            stateRepository.findById(stateId).orElseThrow { exception }
        }
    }
}

@Singleton
@Requires(property = "notifications.scheduling.enabled", value = "true")
open class NotificationScheduler(
    private val coordinator: NotificationScanCoordinator,
) {
    @Scheduled(
        fixedDelay = "\${notifications.scheduling.fixed-delay:1m}",
        initialDelay = "\${notifications.scheduling.initial-delay:1m}",
    )
    open fun queueDueJobs() {
        coordinator.queueDueJobs(OffsetDateTime.now(ZoneOffset.UTC))
    }
}
