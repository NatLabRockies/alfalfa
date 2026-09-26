# Builds the MinIO client (mc) binary from source.
#
# The MC_RELEASE build arg pins the exact upstream release tag
# (https://github.com/minio/mc/releases) that will be checked out and
# compiled. Override it via `--build-arg MC_RELEASE=...` or the
# MC_RELEASE variable in .env to change versions.
FROM golang:1.24-alpine AS build

ARG MC_RELEASE=RELEASE.2022-12-13T00-23-28Z

ENV CGO_ENABLED=0
ENV GOPATH=/go
ENV GOSUMDB=off

RUN apk add --no-cache git bash ca-certificates

WORKDIR /build

RUN git clone --depth 1 --branch ${MC_RELEASE} https://github.com/minio/mc.git .

RUN go build -trimpath -ldflags "$(go run buildscripts/gen-ldflags.go)" -o /go/bin/mc .

# **** Minimal runtime image ****
FROM alpine:3.19

RUN apk add --no-cache ca-certificates

COPY --from=build /go/bin/mc /usr/bin/mc

ENTRYPOINT ["mc"]
