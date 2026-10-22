# Stage 1: Build userms (required as local dependency com.claim:demo)
FROM maven:3.9.6-eclipse-temurin-17 AS userms-builder
WORKDIR /userms
COPY ../userms/userms/pom.xml .
COPY ../userms/userms/src ./src
RUN mvn clean install -DskipTests

# Stage 2: Build credit service
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app
COPY --from=userms-builder /root/.m2 /root/.m2
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 3: Run
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
