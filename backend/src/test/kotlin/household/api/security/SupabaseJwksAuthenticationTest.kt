package household.api.security

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.ECDSASigner
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.Curve
import com.nimbusds.jose.jwk.ECKey
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.KeyUse
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jose.jwk.gen.ECKeyGenerator
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.PlainJWT
import com.nimbusds.jwt.SignedJWT
import com.sun.net.httpserver.HttpServer
import household.api.domain.user.UserRepository
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpStatus
import io.micronaut.http.client.HttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.http.client.exceptions.HttpClientResponseException
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import io.micronaut.test.support.TestPropertyProvider
import jakarta.inject.Inject
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.assertThrows
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Date
import java.util.UUID

@MicronautTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SupabaseJwksAuthenticationTest : TestPropertyProvider {
    private val signingKey = RSAKeyGenerator(2048)
        .keyID("supabase-test-key")
        .keyUse(KeyUse.SIGNATURE)
        .algorithm(JWSAlgorithm.RS256)
        .generate()
    private val ecSigningKey = ECKeyGenerator(Curve.P_256)
        .keyID("supabase-ec-test-key")
        .keyUse(KeyUse.SIGNATURE)
        .algorithm(JWSAlgorithm.ES256)
        .generate()
    private lateinit var jwksServer: HttpServer
    private lateinit var supabaseUrl: String

    @Inject
    @field:Client("/")
    lateinit var client: HttpClient

    @Inject
    lateinit var userRepository: UserRepository

    override fun getProperties(): Map<String, String> {
        jwksServer = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        val jwks = JWKSet(listOf(signingKey.toPublicJWK(), ecSigningKey.toPublicJWK()))
            .toString()
            .toByteArray(StandardCharsets.UTF_8)
        jwksServer.createContext("/auth/v1/.well-known/jwks.json") { exchange ->
            exchange.responseHeaders.add("Content-Type", "application/json")
            exchange.sendResponseHeaders(200, jwks.size.toLong())
            exchange.responseBody.use { it.write(jwks) }
        }
        jwksServer.start()
        supabaseUrl = "http://127.0.0.1:${jwksServer.address.port}"
        return mapOf("supabase.url" to supabaseUrl)
    }

    @AfterAll
    fun stopJwksServer() {
        jwksServer.stop(0)
    }

    @Test
    fun `accepts a correctly signed Supabase access token`() {
        val subject = UUID.randomUUID().toString()
        val response = client.toBlocking().exchange<Any, Any>(
            HttpRequest.GET<Any>("/api/households").bearerAuth(token(subject = subject)),
        )

        assertEquals(HttpStatus.OK, response.status)
        assertEquals("member@example.com", userRepository.findBySupabaseUid(subject)?.email)
    }

    @Test
    fun `accepts an ES256 token from the Supabase JWKS`() {
        val response = client.toBlocking().exchange<Any, Any>(
            HttpRequest.GET<Any>("/api/households").bearerAuth(ecToken()),
        )

        assertEquals(HttpStatus.OK, response.status)
    }

    @Test
    fun `rejects tokens with the wrong issuer`() {
        assertUnauthorized(token(issuer = "https://attacker.example/auth/v1"))
    }

    @Test
    fun `rejects tokens with the wrong audience`() {
        assertUnauthorized(token(audience = "service_role"))
    }

    @Test
    fun `rejects expired tokens`() {
        assertUnauthorized(token(expiresAt = Instant.now().minusSeconds(60)))
    }

    @Test
    fun `rejects tokens signed by an unknown key`() {
        val unknownKey = RSAKeyGenerator(2048).keyID("unknown-key").generate()
        assertUnauthorized(token(signingKey = unknownKey))
    }

    @Test
    fun `rejects tokens without a subject`() {
        assertUnauthorized(token(subject = null))
    }

    @Test
    fun `rejects unsigned tokens`() {
        val claims = JWTClaimsSet.Builder()
            .subject(UUID.randomUUID().toString())
            .issuer("$supabaseUrl/auth/v1")
            .audience("authenticated")
            .expirationTime(Date.from(Instant.now().plusSeconds(300)))
            .build()

        assertUnauthorized(PlainJWT(claims).serialize())
    }

    @Test
    fun `rejects malformed tokens`() {
        assertUnauthorized("not-a-jwt")
    }

    private fun token(
        subject: String? = UUID.randomUUID().toString(),
        issuer: String = "$supabaseUrl/auth/v1",
        audience: String = "authenticated",
        expiresAt: Instant = Instant.now().plusSeconds(300),
        signingKey: RSAKey = this.signingKey,
    ): String {
        val claimsBuilder = JWTClaimsSet.Builder()
            .issuer(issuer)
            .audience(audience)
            .expirationTime(Date.from(expiresAt))
            .issueTime(Date.from(Instant.now()))
            .claim("email", "member@example.com")
        if (subject != null) claimsBuilder.subject(subject)
        val claims = claimsBuilder.build()
        return SignedJWT(
            JWSHeader.Builder(JWSAlgorithm.RS256).keyID(signingKey.keyID).build(),
            claims,
        ).apply { sign(RSASSASigner(signingKey)) }.serialize()
    }

    private fun ecToken(): String {
        val claims = JWTClaimsSet.Builder()
            .subject(UUID.randomUUID().toString())
            .issuer("$supabaseUrl/auth/v1")
            .audience("authenticated")
            .expirationTime(Date.from(Instant.now().plusSeconds(300)))
            .issueTime(Date.from(Instant.now()))
            .claim("email", "member@example.com")
            .build()
        return SignedJWT(
            JWSHeader.Builder(JWSAlgorithm.ES256).keyID(ecSigningKey.keyID).build(),
            claims,
        ).apply { sign(ECDSASigner(ecSigningKey)) }.serialize()
    }

    private fun assertUnauthorized(token: String) {
        val exception = assertThrows<HttpClientResponseException> {
            client.toBlocking().exchange<Any, Any>(
                HttpRequest.GET<Any>("/api/households").bearerAuth(token),
            )
        }
        assertEquals(HttpStatus.UNAUTHORIZED, exception.status)
    }
}
