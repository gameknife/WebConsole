# Multi-stage build: compile the React frontend, embed it into the Go backend,
# and ship a single static binary on a distroless base.

# --- Stage 1: frontend ---
FROM node:24-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend (embeds the built frontend) ---
FROM golang:1.25-alpine AS backend
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./internal/web/dist
# CGO disabled: SQLite is pure Go (modernc.org/sqlite via glebarez/sqlite).
RUN CGO_ENABLED=0 go build -o /webconsole ./cmd/webconsole

# --- Stage 3: runtime ---
FROM gcr.io/distroless/static-debian12
WORKDIR /
COPY --from=backend /webconsole /webconsole
COPY backend/config.docker.yaml /config.yaml
COPY test-roms/ /test-roms/
EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["/webconsole", "-config", "/config.yaml"]
