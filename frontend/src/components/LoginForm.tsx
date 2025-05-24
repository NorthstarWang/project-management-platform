import React, { useState } from "react";
import { logEvent } from "../services/analyticsLogger";
import "./LoginForm.css";

interface LoginFormProps {
  onLoginSuccess: (userId: string) => void;
  sessionId: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, sessionId }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleType = (field: string, value: string) => {
    field === "username" ? setUsername(value) : setPassword(value);
    logEvent(sessionId, "type", { field, value });
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    logEvent(sessionId, "click", {
      target: "toggle-login-mode-btn",
      newMode: isRegister ? "login" : "register",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logEvent(sessionId, "submit", { form: isRegister ? "register" : "login" });

    const endpoint = isRegister ? "register" : "login";
    const res = await fetch(
      `http://localhost:8000/api/${endpoint}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      onLoginSuccess(data.userId);
    } else {
      const error = await res.json();
      alert(error.detail || "Login/Register failed");
    }
  };

  return (
    <div className="login-form-container">
      <h2 className="login-form-title">
        {isRegister ? "Register" : "Login"}
      </h2>
      <form onSubmit={handleSubmit} className="login-form">
        <label className="login-form-label">Username:</label>
        <input
          data-testid="username-input"
          value={username}
          onChange={(e) => handleType("username", e.target.value)}
          className="login-form-input"
        />
        <label className="login-form-label">Password:</label>
        <input
          data-testid="password-input"
          type="password"
          value={password}
          onChange={(e) => handleType("password", e.target.value)}
          className="login-form-input"
        />
        <button
          data-testid="submit-login-btn"
          type="submit"
          className="login-form-button submit"
        >
          {isRegister ? "Register" : "Login"}
        </button>
      </form>
      <button
        data-testid="toggle-login-mode-btn"
        onClick={toggleMode}
        className="login-form-button toggle"
      >
        Switch to {isRegister ? "Login" : "Register"}
      </button>
    </div>
  );
};