FROM ghcr.io/natlabrockies/alfalfa-dependencies:prepare_080 AS base

ENV HOME=/pacer

WORKDIR $HOME

# Install poetry
RUN pip3 install poetry==1.8.3 \
  && poetry config virtualenvs.options.system-site-packages true \
  && poetry config virtualenvs.create false

# Copy and install poetry-based dependencies
COPY pyproject.toml /pacer
COPY poetry.lock /pacer

# Install 'production' dependencies from poetry
RUN poetry install --only main

# Include the path to where pacer_worker is so that system calls can find it.
ENV PYTHONPATH="${HOME}:${PYTHONPATH}"

COPY ./pacer_worker ${HOME}/pacer_worker

COPY ./pacer_worker /pacer/pacer_worker

COPY ./deploy /pacer/deploy
COPY ./deploy/wait-for-it.sh /usr/local/wait-for-it.sh

WORKDIR $HOME/pacer_worker


CMD ["python3", "-m", "pacer_worker"]

# **** Staged build for running in development mode ****
FROM base AS dev

# Reinstall poetry's dev dependencies by calling again without `--only main`,
RUN poetry install --with dev

# for live reloading celery and remote debugging
RUN poetry run pip3 install watchdog[watchmedo] remote-pdb

# COPY all the configuration files needed to run tests correctly
COPY . /pacer

# The docker-compose will require the mounting
# of the files into the container, see docker-compose.dev.yml

# Enable the ability to restart the service when
# the files change
CMD ["watchmedo", "auto-restart", "--directory=/pacer", "--pattern=*.py", "--recursive", "--", "python3", "-m", "pacer_worker"]
