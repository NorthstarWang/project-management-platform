// frontend/src/App.tsx
import React, { useState, useEffect } from "react";
import { LoginForm } from "./components/LoginForm";
import { NotesList } from "./components/NotesList";
import './App.css';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/_synthetic/new_session?seed=123", {
      method: "POST",
      credentials: "include",                  
    })
      .then((r) => r.json())
      .then((d) => {
        setSessionId(d.session_id);            
        (window as any).__SESSION_ID__ = d.session_id;
      });
  }, []);

  if (!sessionId) {
    return <div>Initializing session…</div>;
  }

  return (
    <div className="App">
      {!userId ? (
        <LoginForm sessionId={sessionId} onLoginSuccess={setUserId} />
      ) : (
        <NotesList sessionId={sessionId} userId={userId} />
      )}
    </div>
  );
}

export default App;