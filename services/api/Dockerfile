FROM maven:3.9.15-eclipse-temurin-21-alpine AS builder

WORKDIR /app
COPY . .

RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/target/*.jar /app/api.jar

CMD ["java", "-jar", "/app/api.jar"]