import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatHours = (minutes) =>
  minutes != null
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : "—";

export default function MyAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/attendance/me");

      setAttendance(response.data.attendance || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your attendance history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="shell">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Employee</p>
          <h1>My Attendance</h1>
          <p>View your recent attendance and working hours.</p>
        </div>

        <Link className="back-link" to="/">
          ← Back to Dashboard
        </Link>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>Attendance History</h2>
            <p>
              {loading
                ? "Loading attendance..."
                : `${attendance.length} attendance records`}
            </p>
          </div>

          <button onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check in</th>
                <th>Check out</th>
                <th>Worked</th>
                <th>Source</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {attendance.map((record) => (
                <tr key={record.id}>
                  <td>
                    {new Date(record.workDate).toLocaleDateString()}
                  </td>

                  <td>{formatTime(record.checkInAt)}</td>

                  <td>{formatTime(record.checkOutAt)}</td>

                  <td>{formatHours(record.workedMinutes)}</td>

                  <td>{record.source || "MANUAL"}</td>

                  <td>
                    <span
                      className={`status ${record.status
                        .toLowerCase()
                        .replace("_", "-")}`}
                    >
                      {record.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && attendance.length === 0 && (
            <p className="empty-state">
              No attendance records found.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}