import math
import time
from collections.abc import Callable
from dataclasses import dataclass


@dataclass
class _Window:
    count: int
    started_at: float

class FixedWindowLimiter:
    def __init__(self, limit: int, window_seconds: float,
                 clock: Callable[[], float] = time.monotonic):
        self.limit = limit
        self.window_seconds = window_seconds
        self._clock = clock
        self._windows: dict[str, _Window] = {}

    def try_acquire(self, key: str) -> int:
        now = self._clock()
        window = self._windows.get(key)
        # first question ever, or 60s passed since this window started: new window
        if window is None or now - window.started_at >= self.window_seconds:
            window = _Window(count=0, started_at=now)
            self._windows[key] = window

        if window.count < self.limit:
            window.count += 1
            return 0
        # wait until the window ends how much time left till he can ask again at atleast 1 sec
        return max(1, math.ceil(self.window_seconds - (now - window.started_at)))