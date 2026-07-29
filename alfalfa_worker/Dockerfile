# Many Modelica-exported FMUs (e.g. from Dymola/OpenModelica) with a
# built-in CVode-based solver dynamically link against SUNDIALS 5.x at
# runtime (libsundials_cvode.so.5, libsundials_nvecserial.so.5). This is a
# much older ABI/SONAME than the SUNDIALS 7.1.1 that the alfalfa-dependencies
# base image builds privately for its own Assimulo/PyFMI wheels, and Debian
# bookworm/bullseye only package SUNDIALS 4.x/6.x, so those FMUs fail to load
# with a misleading "cannot open shared object file" error even though the
# .so is present in the FMU. Compile just the SUNDIALS v5.8.0 runtime
# libraries here (built on bullseye for broad glibc compatibility) so they
# can be installed into the final image below, without touching the newer
# SUNDIALS build used by Assimulo/PyFMI.
FROM python:3.10-slim-bullseye AS sundials-legacy-compat
ARG SUNDIALS_LEGACY_VERSION=v5.8.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  cmake \
  build-essential \
  git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /build

RUN gnuArch="$(dpkg-architecture --query DEB_HOST_MULTIARCH)" \
  && git clone --depth 1 -b ${SUNDIALS_LEGACY_VERSION} https://github.com/LLNL/sundials.git \
  && cd sundials \
  && mkdir build && cd build \
  && cmake -DCMAKE_INSTALL_PREFIX=/artifacts -DCMAKE_INSTALL_LIBDIR=lib/${gnuArch} -DEXAMPLES_ENABLE_C=OFF .. \
  && make -j4 \
  && make install

FROM ghcr.io/natlabrockies/alfalfa-dependencies:prepare_080 AS base

ENV HOME=/alfalfa

WORKDIR $HOME

# Install the legacy SUNDIALS 5.x runtime libraries built above (see the
# sundials-legacy-compat stage comment for why these are needed).
ARG TARGETARCH
RUN --mount=type=bind,from=sundials-legacy-compat,source=/artifacts,target=/sundials-legacy set -eux; \
  case "${TARGETARCH:-amd64}" in \
    amd64) gnuArch=x86_64-linux-gnu ;; \
    arm64) gnuArch=aarch64-linux-gnu ;; \
    *) echo "Unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
  esac; \
  cp -P /sundials-legacy/lib/${gnuArch}/libsundials_cvode.so.5* /usr/lib/${gnuArch}/; \
  cp -P /sundials-legacy/lib/${gnuArch}/libsundials_nvecserial.so.5* /usr/lib/${gnuArch}/; \
  ldconfig

# Install poetry
RUN pip3 install poetry==1.8.3 \
  && poetry config virtualenvs.options.system-site-packages true \
  && poetry config virtualenvs.create false

# Copy and install poetry-based dependencies
COPY pyproject.toml /alfalfa
COPY poetry.lock /alfalfa

# Install 'production' dependencies from poetry
RUN poetry install --only main

# Include the path to where alfalfa_worker is so that system calls can find it.
ENV PYTHONPATH="${HOME}:${PYTHONPATH}"

COPY ./alfalfa_worker ${HOME}/alfalfa_worker

COPY ./alfalfa_worker /alfalfa/alfalfa_worker

COPY ./deploy /alfalfa/deploy
COPY ./deploy/wait-for-it.sh /usr/local/wait-for-it.sh

WORKDIR $HOME/alfalfa_worker


CMD ["python3", "-m", "alfalfa_worker"]

# **** Staged build for running in development mode ****
FROM base AS dev

# Reinstall poetry's dev dependencies by calling again without `--only main`,
RUN poetry install --with dev

# for live reloading celery and remote debugging
RUN poetry run pip3 install watchdog[watchmedo] remote-pdb

# COPY all the configuration files needed to run tests correctly
COPY . /alfalfa

# The docker-compose will require the mounting
# of the files into the container, see docker-compose.dev.yml

# Enable the ability to restart the service when
# the files change
CMD ["watchmedo", "auto-restart", "--directory=/alfalfa", "--pattern=*.py", "--recursive", "--", "python3", "-m", "alfalfa_worker"]
