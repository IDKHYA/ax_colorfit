# 동시 처리 제한(InferenceGate)이 실제로 이벤트 루프를 막지 않고, 한도 초과 시 즉시 거절하는지 검증합니다.
from __future__ import annotations

import threading
import unittest

from ml_service.concurrency import BusyError, InferenceGate


class InferenceGateTest(unittest.IsolatedAsyncioTestCase):
    async def test_rejects_immediately_when_capacity_exceeded(self):
        gate = InferenceGate(capacity=1)
        started = threading.Event()
        release = threading.Event()

        def slow_task():
            started.set()
            release.wait(timeout=5)
            return "done"

        import asyncio

        task = asyncio.create_task(gate.run(slow_task))
        await asyncio.get_event_loop().run_in_executor(None, started.wait, 5)

        with self.assertRaises(BusyError):
            await gate.run(lambda: "should not run")

        release.set()
        result = await task
        self.assertEqual(result, "done")

    async def test_slot_is_freed_after_completion(self):
        gate = InferenceGate(capacity=1)
        await gate.run(lambda: None)
        result = await gate.run(lambda: "ok")
        self.assertEqual(result, "ok")

    async def test_release_happens_even_when_func_raises(self):
        gate = InferenceGate(capacity=1)

        def boom():
            raise RuntimeError("boom")

        with self.assertRaises(RuntimeError):
            await gate.run(boom)

        # 실패해도 자리는 반납돼야 다음 요청이 막히지 않는다.
        result = await gate.run(lambda: "ok")
        self.assertEqual(result, "ok")


if __name__ == "__main__":
    unittest.main()
