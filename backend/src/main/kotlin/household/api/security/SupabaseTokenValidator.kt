package household.api.security

import io.micronaut.context.annotation.Value
import io.micronaut.core.async.publisher.Publishers
import io.micronaut.http.HttpRequest
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.token.validator.TokenValidator
import jakarta.inject.Singleton
import org.reactivestreams.Publisher
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Validates Supabase-issued JWTs (HS256) against the Supabase JWT secret.
 * Extracts sub (supabase user ID) and email claims from the token payload.
 */
@Singleton
class SupabaseTokenValidator(
    @Value("\${supabase.jwt-secret}") private val jwtSecret: String,
) : TokenValidator<HttpRequest<*>> {

    override fun validateToken(token: String, request: HttpRequest<*>?): Publisher<Authentication> {
        val authentication = verifyAndExtract(token) ?: return Publishers.empty()
        return Publishers.just(authentication)
    }

    private fun verifyAndExtract(token: String): Authentication? {
        val parts = token.split(".")
        if (parts.size != 3) return null
        return try {
            if (!verifySignature(parts[0], parts[1], parts[2])) return null
            val payload = String(Base64.getUrlDecoder().decode(pad(parts[1])))
            val sub   = extractString(payload, "sub")   ?: return null
            val exp   = extractLong(payload, "exp")     ?: return null
            val email = extractString(payload, "email") ?: ""
            if (exp < System.currentTimeMillis() / 1000) return null
            Authentication.build(sub, mapOf("email" to email, "supabase_uid" to sub))
        } catch (e: Exception) { null }
    }

    private fun verifySignature(header: String, payload: String, signature: String): Boolean {
        return try {
            val mac = Mac.getInstance("HmacSHA256")
            mac.init(SecretKeySpec(jwtSecret.toByteArray(), "HmacSHA256"))
            val expected = mac.doFinal("$header.$payload".toByteArray())
            val actual   = Base64.getUrlDecoder().decode(pad(signature))
            expected.contentEquals(actual)
        } catch (e: Exception) { false }
    }

    private fun pad(s: String) = s + "=".repeat((4 - s.length % 4) % 4)

    private fun extractString(json: String, key: String): String? =
        Regex(""""$key"\s*:\s*"([^"]*?)"""").find(json)?.groupValues?.get(1)

    private fun extractLong(json: String, key: String): Long? =
        Regex(""""$key"\s*:\s*(\d+)""").find(json)?.groupValues?.get(1)?.toLongOrNull()
}
