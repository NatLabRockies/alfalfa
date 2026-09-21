from queue import Empty, SimpleQueue


class MockRedisPubSub():

    def __init__(self):
        self.messages: SimpleQueue = SimpleQueue()
        self.channels = []

    def get_message(self, timeout=0.0):
        message = None
        try:
            # Mirrors redis-py's PubSub.get_message signature/behavior
            if timeout:
                message = self.messages.get(block=True, timeout=timeout)
            else:
                message = self.messages.get(False)
            return message
        except Empty:
            return message

    def subscribe(self, channel: str):
        self.channels.append(channel)
