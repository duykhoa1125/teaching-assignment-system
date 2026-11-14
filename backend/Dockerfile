# syntax=docker/dockerfile:1
ARG MAVEN_IMAGE=maven:3.9.9-eclipse-temurin-17
ARG JAVA_IMAGE=eclipse-temurin:17-jre-noble

FROM ${MAVEN_IMAGE} AS build
WORKDIR /workspace
COPY pom.xml ./pom.xml
COPY algorithm/tass-cpsat/pom.xml ./algorithm/tass-cpsat/pom.xml
COPY backend/pom.xml ./backend/pom.xml
COPY algorithm/tass-cpsat/src ./algorithm/tass-cpsat/src
COPY algorithm/tass-cpsat/fixtures ./algorithm/tass-cpsat/fixtures
COPY backend/src ./backend/src
# The classifier core is produced at package phase in the reactor; no host .m2/JDK is used.
# Tests are an explicit separate target, not part of the development image build.
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -pl backend -am -Dmaven.test.skip=true package \
    && cp backend/target/tass-backend-0.1.0-SNAPSHOT.jar /workspace/app.jar

FROM build AS test-runner
USER root
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY backend/sql ./backend/sql
COPY --chmod=0555 infra/docker/run-tests.sh /opt/tass/run-tests.sh
ENTRYPOINT ["sh", "/opt/tass/run-tests.sh"]

FROM ${JAVA_IMAGE} AS runtime
# glibc base is required by the OR-Tools Linux JNI artifacts; do not replace with Alpine.
RUN apt-get update && apt-get install -y --no-install-recommends curl libstdc++6 libgcc-s1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 tass \
    && useradd --system --uid 10001 --gid tass --home-dir /app --shell /usr/sbin/nologin tass
WORKDIR /app
COPY --from=build --chown=tass:tass /workspace/app.jar /app/app.jar
USER 10001:10001
ENV SERVER_ADDRESS=0.0.0.0 SERVER_PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=6 \
    CMD curl --fail --silent --show-error http://127.0.0.1:8080/internal/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
