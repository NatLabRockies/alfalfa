FROM grafana/grafana:8.5.4

# expose env vars during build for access during provisioning
ARG INFLUXDB_HOST
ARG INFLUXDB_DB
ARG INFLUXDB_ADMIN_USER
ARG INFLUXDB_ADMIN_PASSWORD
RUN printenv
COPY ./provisioning /etc/grafana/provisioning
COPY ./config.ini /etc/grafana/config.ini
COPY ./dashboards /var/lib/grafana/dashboards
