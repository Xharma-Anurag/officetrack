import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import AttendanceReport from "./pages/AttendanceReport";
import EmployeeAttendance from "./pages/EmployeeAttendance";
import MyAttendance from "./pages/MyAttendance";
import Leaves from "./pages/Leaves";
import AdminLeaves from "./pages/AdminLeaves";
import Reports from "./pages/Reports.jsx";

import "./styles.css";


function Nav() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const isAdmin =
    user.role === "HR_ADMIN" ||
    user.role === "SUPER_ADMIN";

  return (
    <nav className="main-nav">

      {/* Dashboard */}
      <Link to="/">
        Dashboard
      </Link>


      {/* Employees */}
      {isAdmin && (
        <Link to="/employees">
          Employees
        </Link>
      )}


      {/* Attendance */}
      {isAdmin && (
        <Link to="/attendance">
          Attendance
        </Link>
      )}


      {/* Reports & Analytics */}
      {isAdmin && (
        <Link to="/reports">
          Reports & Analytics
        </Link>
      )}


      {/* Leaves */}
      {isAdmin ? (
        <Link to="/leave-requests">
          Leave Requests
        </Link>
      ) : (
        <Link to="/leaves">
          My Leaves
        </Link>
      )}

    </nav>
  );
}


export default function App() {
  return (
    <AuthProvider>

      <BrowserRouter>

        <Nav />

        <Routes>


          {/* =========================
              LOGIN
          ========================= */}

          <Route
            path="/login"
            element={<Login />}
          />


          {/* =========================
              REGISTER
          ========================= */}

          <Route
            path="/register"
            element={<Register />}
          />


          {/* =========================
              DASHBOARD
          ========================= */}

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />


          {/* =========================
              EMPLOYEES
          ========================= */}

          <Route
            path="/employees"
            element={
              <ProtectedRoute
                roles={[
                  "HR_ADMIN",
                  "SUPER_ADMIN",
                ]}
              >
                <Employees />
              </ProtectedRoute>
            }
          />


          {/* =========================
              ATTENDANCE REPORT
          ========================= */}

          <Route
            path="/attendance"
            element={
              <ProtectedRoute
                roles={[
                  "HR_ADMIN",
                  "SUPER_ADMIN",
                ]}
              >
                <AttendanceReport />
              </ProtectedRoute>
            }
          />


          {/* =========================
              MY ATTENDANCE
          ========================= */}

          <Route
            path="/attendance/me"
            element={
              <ProtectedRoute>
                <MyAttendance />
              </ProtectedRoute>
            }
          />


          {/* =========================
              EMPLOYEE ATTENDANCE HISTORY
          ========================= */}

          <Route
            path="/employees/:id/attendance"
            element={
              <ProtectedRoute
                roles={[
                  "HR_ADMIN",
                  "SUPER_ADMIN",
                ]}
              >
                <EmployeeAttendance />
              </ProtectedRoute>
            }
          />


          {/* =========================
              EMPLOYEE - MY LEAVES
          ========================= */}

          <Route
            path="/leaves"
            element={
              <ProtectedRoute>
                <Leaves />
              </ProtectedRoute>
            }
          />


          {/* =========================
              ADMIN - LEAVE REQUESTS
          ========================= */}

          <Route
            path="/leave-requests"
            element={
              <ProtectedRoute
                roles={[
                  "HR_ADMIN",
                  "SUPER_ADMIN",
                ]}
              >
                <AdminLeaves />
              </ProtectedRoute>
            }
          />


          {/* =========================
              ADMIN - REPORTS & ANALYTICS
          ========================= */}

          <Route
            path="/reports"
            element={
              <ProtectedRoute
                roles={[
                  "HR_ADMIN",
                  "SUPER_ADMIN",
                ]}
              >
                <Reports />
              </ProtectedRoute>
            }
          />

        </Routes>

      </BrowserRouter>

    </AuthProvider>
  );
}