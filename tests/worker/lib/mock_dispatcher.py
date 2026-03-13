import os
import threading
from pathlib import Path

from pacer_worker.dispatcher import Dispatcher
from pacer_worker.lib.job import Job


class MockDispatcher(Dispatcher):
    def __init__(self, workdir: Path):
        os.chdir(workdir)
        super().__init__(workdir)

    def start_job(self, job_name, parameters) -> Job:
        os.chdir(self.workdir)
        job = self.create_job(job_name, parameters)
        thread = threading.Thread(target=job.start)
        thread.start()
        return job
