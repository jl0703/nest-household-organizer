package household.api.domain

import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.UUID
import javax.sql.DataSource

@MicronautTest
class NotificationMigrationTest {
    @Inject lateinit var dataSource: DataSource

    @Test
    fun `existing V4 household data upgrades through V5`() {
        val schema = "notification_upgrade_${UUID.randomUUID().toString().replace("-", "")}"
        dataSource.connection.use { connection ->
            connection.createStatement().use { it.execute("CREATE SCHEMA $schema") }
        }
        Flyway.configure()
            .dataSource(dataSource)
            .schemas(schema)
            .defaultSchema(schema)
            .locations("classpath:db/migration")
            .target("4")
            .load()
            .migrate()

        val userId = UUID.randomUUID()
        val householdId = UUID.randomUUID()
        dataSource.connection.use { connection ->
            connection.createStatement().use { statement ->
                statement.executeUpdate(
                    "INSERT INTO $schema.users (id, supabase_uid, display_name, email) VALUES ('$userId', '${UUID.randomUUID()}', 'Owner', 'owner@test.com')"
                )
                statement.executeUpdate(
                    "INSERT INTO $schema.households (id, name, owner_id) VALUES ('$householdId', 'Home', '$userId')"
                )
                statement.executeUpdate(
                    "INSERT INTO $schema.household_members (household_id, user_id, role) VALUES ('$householdId', '$userId', 'owner')"
                )
            }
        }

        Flyway.configure()
            .dataSource(dataSource)
            .schemas(schema)
            .defaultSchema(schema)
            .locations("classpath:db/migration")
            .load()
            .migrate()

        dataSource.connection.use { connection ->
            connection.createStatement().use { statement ->
                statement.executeUpdate(
                    "INSERT INTO $schema.notification_preferences (household_id, user_id) VALUES ('$householdId', '$userId')"
                )
                statement.executeQuery(
                    "SELECT daily_digest_enabled, event_reminders_enabled, chore_reminders_enabled, digest_time FROM $schema.notification_preferences"
                ).use { result ->
                    assertTrue(result.next())
                    assertTrue(result.getBoolean("daily_digest_enabled"))
                    assertTrue(result.getBoolean("event_reminders_enabled"))
                    assertTrue(result.getBoolean("chore_reminders_enabled"))
                    assertEquals("08:00:00", result.getTime("digest_time").toString())
                }
            }
        }
    }
}
