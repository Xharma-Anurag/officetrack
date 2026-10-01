import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function MyAttendance() {
  const { user } = useAuth();

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAttendance();
  }, []);

  async function loadAttendance() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/attendance/me");

      setAttendance(response.data.attendance || []);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Unable to load your attendance history."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(date) {
    if (!date) return "-";

    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusClass(status) {
    switch (status) {
      case "PRESENT":
        return "status-badge status-present";

      case "LATE":
        return "status-badge status-late";

      case "MISSING_CHECKOUT":
        return "status-badge status-missing";

      default:
        return "status-badge";
    }
  }

  function getStatusText(status) {
    switch (status) {
      case "PRESENT":
        return "Present";

      case "LATE":
        return "Late";

      case "MISSING_CHECKOUT":
        return "Missing Checkout";

      default:
        return status || "Unknown";
    }
  }

  if (loading) {
    return (
      <main className="page-shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">ATTENDANCE</span>
            <h1>My Attendance</h1>
            <p>Loading your attendance history...</p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="empty-state">
            Loading attendance...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">ATTENDANCE</span>

          <h1>My Attendance</h1>

          <p>
            View your attendance history and working hours.
          </p>
        </div>

        <Link to="/" className="secondary-button">
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="alert-card error">
          {error}
        </div>
      )}

      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <h2>{user?.name || "Employee"}</h2>

            <p>
              {user?.employeeCode || user?.email || ""}
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={loadAttendance}
          >
            Refresh
          </button>
        </div>

        {attendance.length === 0 ? (
          <div className="empty-state">
            <h3>No attendance records</h3>

            <p>
              Your attendance history will appear here after you
              check in.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {attendance.map((record) => {
                  const workedMinutes =
                    record.workedMinutes || 0;

                  const hours = Math.floor(
                    workedMinutes / 60
                  );

                  const minutes = workedMinutes % 60;

                  return (
                    <tr key={record.id}>
                      <td>
                        {formatDate(record.workDate)}
                      </td>

                      <td>
                        {formatTime(record.checkInAt)}
                      </td>

                      <td>
                        {formatTime(record.checkOutAt)}
                      </td>

                      <td>
                        {record.workedMinutes != null
                          ? `${hours}h ${minutes}m`
                          : "-"}
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            record.status
                          )}
                        >
                          {getStatusText(record.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}