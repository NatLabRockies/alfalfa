from queue import Empty, SimpleQueue


class MockRedisPubSub():

    def __init__(self):
        self.messages: SimpleQueue = SimpleQueue()
        self.channels = []

    def get_message(self, timeout=0.0):
        message = None
        try:
            # Mirror redis-py's PubSub.get_message: timeout=0.0 (or None, which SimpleQueue
            # treats as block-forever) polls without blocking indefinitely, while a positive
            # timeout blocks up to that many seconds waiting for a message.
            message = self.messages.get(block=bool(timeout), timeout=timeout or None)
            return message
        except Empty:
            return message

    def subscribe(self, channel: str):
        self.channels.append(channel)
