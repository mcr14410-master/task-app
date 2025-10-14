# backend/Dockerfile  (Java 17, Multi-Stage, cache-freundlich)

# -------- Build-Stage --------
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# 1) Dependencies cachen
COPY pom.xml .
RUN mvn -B -q -DskipTests dependency:go-offline

# 2) Quellcode
COPY src ./src

# 3) Jar bauen (ohne Tests)
RUN mvn -B -DskipTests package

# -------- Runtime-Stage --------
FROM eclipse-temurin:17-jre
WORKDIR /app

# (optional) Non-root User
# RUN useradd -r -u 10001 appuser
# USER appuser

COPY --from=build /app/target/*.jar /app/app.jar

# Optional: JVM-Flags via ENV
ENV JAVA_OPTS=""

EXPOSE 8080
ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar /app/app.jar"]

