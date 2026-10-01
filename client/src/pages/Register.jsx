import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { register } = useAuth();
  const nav = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await register(name, email, password);
      nav("/");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create the account");
    }
  }

  return (
    <main className="center">
      <form className="card" onSubmit={submit}>
        <h1>Create account</h1>
        <p>Join your OfficeTrack organisation.</p>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" type="email" autoComplete="email" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (at least 8 characters)" type="password" autoComplete="new-password" minLength="8" required />
        <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" type="password" autoComplete="new-password" minLength="8" required />

        <button type="submit">Create account</button>
        <p>Already have an account? <Link to="/login">Log in</Link></p>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
