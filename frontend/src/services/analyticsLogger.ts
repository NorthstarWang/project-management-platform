export type LogPayload = {
  [key: string]: any; // Keep this for flexibility
};

export async function logEvent(
  sessionId: string,
  action: string, // Renamed from actionType for clarity
  payload: LogPayload = {}
) {
  try {
    await fetch(
      `http://localhost:8000/_synthetic/log_event?session_id=${sessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: action, payload, timestamp: new Date().toISOString(), type: "track" }),
      }
    );
  } catch (err) {
    console.error("Error logging action:", err);
  }
}