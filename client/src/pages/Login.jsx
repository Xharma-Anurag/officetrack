import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();

    try {
      await login(email, password);
      nav("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  return (
    <main className="center">
      <form className="card" onSubmit={submit}>
        <h1>OfficeTrack</h1>
        <p>Corporate attendance portal</p>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          required
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          required
        />

        <button type="submit">Login</button>

        <p>
          New employee? <Link to="/register">Create an account</Link>
        </p>

        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
