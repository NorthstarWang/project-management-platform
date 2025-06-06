import time
from typing import Any, Dict, List

class Logger:
    def __init__(self):
        self.logs: List[Dict[str, Any]] = []

    def log_action(self, session_id: str, action_type: str, payload: Dict[str, Any]):
        entry = {
            "timestamp": time.time(),
            "session_id": session_id,
            "action_type": action_type,
            "payload": payload,
        }
        self.logs.append(entry)

    def get_logs(self, session_id: str = None) -> List[Dict[str, Any]]:
        if session_id:
            return [l for l in self.logs if l["session_id"] == session_id]
        return self.logs

    def clear_logs(self):
        self.logs.clear()

logger = Logger()

class LogMiddleware:
    def __init__(self):
        pass

    async def __call__(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        session_id = (
            request.cookies.get("session_id")
            or request.query_params.get("session_id")
            or "no_session"
        )
        logger.log_action(
            session_id=session_id,
            action_type="HTTP_REQUEST",
            payload={
                "text": f"User made a request to {request.url} with method {request.method}, query params {request.query_params}, body {request.body}, status code {response.status_code}",
                "method": request.method,
                "url": str(request.url),
                "status_code": response.status_code,
                "process_time_ms": int(process_time * 1000),
            }
        )
        return response