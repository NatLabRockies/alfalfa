#!/bin/bash

# Make sure that all of these other servers are ready before starting the worker node

echo "Waiting for minio to start"
/usr/local/wait-for-it.sh --strict -t 0 minio:9000

echo "Waiting for redis to start"
/usr/local/wait-for-it.sh --strict $REDIS_HOST:$REDIS_PORT

echo "Waiting for mongo to start"
/usr/local/wait-for-it.sh --strict $MONGO_HOST:$MONGO_PORT

echo "Historian Enable"
echo $HISTORIAN_ENABLE

if [[ $HISTORIAN_ENABLE = 'true' ]]
then
  echo "Historian enabled"

  echo "Waiting for influxdb to start"
  /usr/local/wait-for-it.sh --strict $INFLUXDB_HOST:$INFLUXDB_PORT

else
  echo "Historian not enabled"
fi

cd /pacer
echo "Python being used is: $(which python)"
python3 -m pacer_worker
