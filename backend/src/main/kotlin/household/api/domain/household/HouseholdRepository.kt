package household.api.domain.household

import io.micronaut.data.jdbc.annotation.JdbcRepository
import io.micronaut.data.model.query.builder.sql.Dialect
import io.micronaut.data.repository.CrudRepository
import java.util.UUID

@JdbcRepository(dialect = Dialect.POSTGRES)
interface HouseholdRepository : CrudRepository<Household, UUID> {
    fun findByOwnerId(ownerId: UUID): List<Household>
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface HouseholdMemberRepository : CrudRepository<HouseholdMember, UUID> {
    fun findByHouseholdId(householdId: UUID): List<HouseholdMember>
    fun findByUserId(userId: UUID): List<HouseholdMember>
    fun findByHouseholdIdAndUserId(householdId: UUID, userId: UUID): HouseholdMember?
    fun deleteByHouseholdIdAndUserId(householdId: UUID, userId: UUID)
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface ChildProfileRepository : CrudRepository<ChildProfile, UUID> {
    fun findByHouseholdId(householdId: UUID): List<ChildProfile>
}

@JdbcRepository(dialect = Dialect.POSTGRES)
interface InvitationRepository : CrudRepository<Invitation, UUID> {
    fun findByToken(token: String): Invitation?
    fun findByHouseholdId(householdId: UUID): List<Invitation>
    fun findByRecipientEmailAndStatus(email: String, status: String): List<Invitation>
}
