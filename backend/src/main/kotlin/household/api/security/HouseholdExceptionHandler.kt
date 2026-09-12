package household.api.security

import household.api.domain.household.HouseholdException
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpResponse
import io.micronaut.http.annotation.Produces
import io.micronaut.http.server.exceptions.ExceptionHandler
import io.micronaut.serde.annotation.Serdeable
import jakarta.inject.Singleton

@Serdeable
data class ErrorBody(val message: String)

@Singleton
@Produces
class HouseholdExceptionHandler : ExceptionHandler<HouseholdException, HttpResponse<ErrorBody>> {
    override fun handle(request: HttpRequest<*>, exception: HouseholdException): HttpResponse<ErrorBody> =
        HttpResponse.badRequest(ErrorBody(exception.message ?: "Bad request"))
}
