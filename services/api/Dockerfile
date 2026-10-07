FROM maven:3.9.15-eclipse-temurin-21-alpine AS builder

WORKDIR /app
COPY . .

RUN mvn package -Dspring.datasource.url=jdbc:h2:mem:vigil -Dspring.datasource.username=sa -Dspring.datasource.password=sa

FROM gcr.io/distroless/java21-debian12 AS runtime

WORKDIR /app

COPY --from=builder /app/target/*.jar /app/api.jar

EXPOSE 8080

CMD ["/app/api.jar"]
