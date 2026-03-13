from logging import Handler, LogRecord

from pacer_worker.lib.models import Run
from pacer_worker.lib.pacer_connections_manager import PACERConnectionsManager


class RedisLogHandler(Handler):
    def __init__(self, run: Run, level: int | str = 0) -> None:
        super().__init__(level)
        connections_manager = PACERConnectionsManager()
        self.redis = connections_manager.redis
        self.run = run

    def emit(self, record: LogRecord) -> None:
        self.redis.rpush(f"run:{self.run.ref_id}:log", self.format(record))
