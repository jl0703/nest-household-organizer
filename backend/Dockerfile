# Build stage: compile the shadow (fat) jar with Gradle.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /home/app

COPY gradlew gradle.properties settings.gradle.kts build.gradle.kts micronaut-cli.yml ./
COPY gradle gradle
RUN chmod +x gradlew && sed -i '/org.gradle.java.home/d' gradle.properties

COPY src src
RUN ./gradlew shadowJar -x test --no-daemon

# Runtime stage: run the fat jar on a slim JRE.
FROM eclipse-temurin:25-jre
WORKDIR /home/app
COPY --from=build /home/app/build/libs/*-all.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
