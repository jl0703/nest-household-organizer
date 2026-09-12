package household.api.domain.user

import io.micronaut.security.authentication.Authentication
import io.micronaut.transaction.annotation.Transactional
import jakarta.inject.Singleton

@Singleton
open class UserService(private val userRepository: UserRepository) {

    fun resolveOrCreate(authentication: Authentication): User {
        val supabaseUid = authentication.name
        val email = authentication.attributes["email"] as? String ?: ""
        val displayName = (authentication.attributes["name"] as? String)
            ?: email.substringBefore("@").ifBlank { supabaseUid }
        return userRepository.findBySupabaseUid(supabaseUid)
            ?: createUser(supabaseUid, email, displayName)
    }

    @Transactional
    open fun createUser(supabaseUid: String, email: String, displayName: String): User =
        userRepository.save(User(supabaseUid = supabaseUid, email = email, displayName = displayName))

    @Transactional
    open fun deleteUser(user: User): User =
        userRepository.update(user.copy(deletedAt = java.time.OffsetDateTime.now()))
}
