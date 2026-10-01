import React from "react";
import{
  createContext,
  useContext,
  useState,
} from "react";

import { api } from "../services/api";

const C = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null")
  );

  async function login(email, password) {
    const { data } = await api.post("/auth/login", {
      email,
      password,
    });

    saveSession(data);
  }

  async function register(name, email, password) {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
    });

    saveSession(data);
  }

  function saveSession(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  return (
    <C.Provider value={{ user, login, register, logout }}>
      {children}
    </C.Provider>
  );
}

export const useAuth = () => useContext(C);
