import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "—";

  const raw = String(value);
  const datePart = raw.slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return "—";
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return "—";

  const value = Number(minutes);

  if (Number.isNaN(value)) return "—";

  const h = Math.floor(value / 60);
  const m = value % 60;

  return `${h}h ${m}m`;
}

function statusLabel(status) {
  if (!status) return "Not checked in";

  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status) {
  if (!status) return "status";

  return `status ${status.toLowerCase().replaceAll("_", "-")}`;
}

function todayString() {
  const now = new Date();

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();

  /*
    OFFICE TRACK ATTENDANCE RULE

    HR_ADMIN / SUPER_ADMIN
    → Owners / Admins
    → NO attendance

    MANAGER
    → HR Manager / Sales Managers
    → Attendance required

    EMPLOYEE
    → HR Executive
    → Attendance required
  */
  const isAdmin = ["HR_ADMIN", "SUPER_ADMIN"].includes(
    user?.role
  );

  const isAttendanceStaff = ["EMPLOYEE", "MANAGER"].includes(
    user?.role
  );

  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [report, setReport] = useState(null);

  const [selectedDate, setSelectedDate] = useState(
    todayString()
  );

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  /*
    ============================================
    EMPLOYEE / MANAGER DASHBOARD
    ============================================

    Only attendance staff can call:
      /attendance/today
      /attendance/me
  */
  async function loadEmployeeDashboard() {
    if (!isAttendanceStaff) {
      setToday(null);
      setHistory([]);
      return;
    }

    const [todayResponse, historyResponse] =
      await Promise.all([
        api.get("/attendance/today"),
        api.get("/attendance/me"),
      ]);

    setToday(todayResponse.data.attendance);
    setHistory(historyResponse.data.attendance || []);
  }

  /*
    ============================================
    ADMIN / OWNER DASHBOARD
    ============================================

    Backend report should return only:
      EMPLOYEE
      MANAGER

    We ALSO filter again on frontend as a safety layer.
  */
  async function loadAdminDashboard(date = selectedDate) {
    if (!isAdmin) {
      setReport(null);
      return;
    }

    const response = await api.get("/attendance/report", {
      params: { date },
    });

    setReport(response.data);
  }

  /*
    ============================================
    MAIN DASHBOARD LOADER
    ============================================
  */
  async function loadDashboard() {
    try {
      setLoading(true);
      setMessage("");

      if (isAdmin) {
        // Owners/Admins ONLY see organisation data.
        setToday(null);
        setHistory([]);

        await loadAdminDashboard(selectedDate);
      } else {
        // Employees and Managers see personal attendance.
        setReport(null);

        await loadEmployeeDashboard();
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;

    loadDashboard();
  }, [isAdmin]);

  /*
    ============================================
    CHECK IN / CHECK OUT
    ============================================
  */
  async function handleAttendanceAction(type) {
    if (!isAttendanceStaff) {
      setMessage(
        "Owner/Admin accounts do not use attendance."
      );
      return;
    }

    try {
      setActionLoading(true);
      setMessage("");

      const response = await api.post(
        `/attendance/${type}`
      );

      setToday(response.data.attendance);

      setMessage(
        type === "check-in"
          ? "Checked in successfully."
          : "Checked out successfully."
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Attendance action failed. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /*
    ============================================
    ADMIN DATE CHANGE
    ============================================
  */
  async function changeReportDate(event) {
    const date = event.target.value;

    setSelectedDate(date);

    try {
      setLoading(true);
      setMessage("");

      await loadAdminDashboard(date);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to load attendance report."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ============================================
    EXTRA FRONTEND SAFETY FILTER
    ============================================

    Even if backend accidentally sends an admin,
    they will NEVER appear in this table.
  */
  const staffRows = useMemo(() => {
    const rows = report?.rows || [];

    return rows.filter((row) =>
      ["EMPLOYEE", "MANAGER"].includes(
        row.employee?.role
      )
    );
  }, [report]);

  /*
    SEARCH STAFF
  */
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return staffRows;

    return staffRows.filter((row) =>
      [
        row.employee?.name,
        row.employee?.email,
        row.employee?.employeeCode,
        row.employee?.department?.name,
        row.employee?.role,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )
    );
  }, [staffRows, search]);

  /*
    ============================================
    DEPARTMENT SUMMARY
    ============================================
  */
  const departmentSummary = useMemo(() => {
    const map = new Map();

    for (const row of staffRows) {
      const department =
        row.employee?.department?.name ||
        "Unassigned";

      if (!map.has(department)) {
        map.set(department, {
          name: department,
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
        });
      }

      const item = map.get(department);

      item.total += 1;

      if (row.status === "PRESENT") {
        item.present += 1;
      }

      if (row.status === "LATE") {
        item.late += 1;
      }

      if (row.status === "ABSENT") {
        item.absent += 1;
      }
    }

    return [...map.values()].sort(
      (a, b) => b.total - a.total
    );
  }, [staffRows]);

  /*
    ============================================
    ADMIN SUMMARY
    ============================================
  */
  const summary = {
    total: staffRows.length,

    present: staffRows.filter(
      (row) => row.status === "PRESENT"
    ).length,

    late: staffRows.filter(
      (row) => row.status === "LATE"
    ).length,

    missingCheckout: staffRows.filter(
      (row) =>
        row.status === "MISSING_CHECKOUT" ||
        (row.attendance &&
          !row.attendance.checkOutAt)
    ).length,

    absent: staffRows.filter(
      (row) => row.status === "ABSENT"
    ).length,
  };

  const attendanceRate = summary.total
    ? Math.round(
        ((summary.present + summary.late) /
          summary.total) *
          100
      )
    : 0;

  /*
    ============================================
    EMPLOYEE ATTENDANCE CALCULATIONS
    ============================================
  */
  const attendanceCompleted = Boolean(
    today?.checkOutAt
  );

  const checkedIn = Boolean(
    today?.checkInAt
  );

  const monthPrefix = selectedDate.slice(0, 7);

  const monthlyRecords = history.filter((item) => {
    if (!item.workDate) return false;

    return String(item.workDate)
      .slice(0, 10)
      .startsWith(monthPrefix);
  });

  const monthlyPresent = monthlyRecords.filter(
    (item) =>
      ["PRESENT", "LATE"].includes(
        item.status
      )
  ).length;

  const monthlyRate = monthlyRecords.length
    ? Math.round(
        (monthlyPresent /
          monthlyRecords.length) *
          100
      )
    : 0;

  /*
    ============================================
    UI
    ============================================
  */
  return (
    <main className="shell">

      {/* ================= HEADER ================= */}

      <header className="dashboard-heading">
        <div>
          <p className="eyebrow">
            {isAdmin
              ? "Employer Dashboard"
              : "Employee Dashboard"}
          </p>

          <h1>
            Hello,{" "}
            {user?.name?.split(" ")[0] ||
              "there"}{" "}
            👋
          </h1>

          <p>
            {isAdmin
              ? "Monitor your organisation's attendance from one place."
              : "Here is your attendance overview for today."}
          </p>
        </div>

        <div className="dashboard-actions">

          <button
            className="secondary"
            onClick={loadDashboard}
            disabled={
              loading ||
              actionLoading
            }
          >
            {loading
              ? "Loading..."
              : "Refresh"}
          </button>

          <button onClick={logout}>
            Log out
          </button>

        </div>
      </header>

      {/* ================= MESSAGE ================= */}

      {message && (
        <p
          className={
            message
              .toLowerCase()
              .includes("success")
              ? "success"
              : "error"
          }
        >
          {message}
        </p>
      )}

      {/* ==================================================
          ADMIN / OWNER DASHBOARD
          ================================================== */}

      {isAdmin ? (
        <>
          <section className="admin-welcome">

            <div>
              <p className="eyebrow">
                Organisation Overview
              </p>

              <h2>
                Attendance Monitor
              </h2>

              <p>
                Monitor attendance for HR and
                Sales staff. Owner accounts are
                not included in attendance.
              </p>
            </div>

            <div className="admin-welcome-actions">

              <Link
                className="button-link light-button"
                to="/employees"
              >
                Manage Employees
              </Link>

              <Link
                className="button-link outline-button"
                to="/attendance"
              >
                Full Attendance Report
              </Link>

            </div>

          </section>

          {/* ================= STATS ================= */}

          <section className="stats admin-stats">

            <article>
              <span>Total Staff</span>

              <strong>
                {loading
                  ? "—"
                  : summary.total}
              </strong>

              <small>
                Employees and managers
              </small>
            </article>

            <article className="present">

              <span>Present</span>

              <strong>
                {loading
                  ? "—"
                  : summary.present}
              </strong>

              <small>
                On-time attendance
              </small>

            </article>

            <article className="late">

              <span>Late</span>

              <strong>
                {loading
                  ? "—"
                  : summary.late}
              </strong>

              <small>
                Arrived late
              </small>

            </article>

            <article className="absent">

              <span>Absent</span>

              <strong>
                {loading
                  ? "—"
                  : summary.absent}
              </strong>

              <small>
                No attendance record
              </small>

            </article>

            <article className="missing">

              <span>
                Missing Checkout
              </span>

              <strong>
                {loading
                  ? "—"
                  : summary.missingCheckout}
              </strong>

              <small>
                Needs review
              </small>

            </article>

          </section>

          {/* ================= FILTER ================= */}

          <section className="admin-toolbar card">

            <div>

              <p className="eyebrow">
                Daily Control
              </p>

              <h2>
                Attendance for{" "}
                {formatDate(
                  selectedDate
                )}
              </h2>

              <p className="muted">
                Overall attendance rate:{" "}
                <strong>
                  {attendanceRate}%
                </strong>
              </p>

            </div>

            <div className="admin-controls">

              <label>
                <span>
                  Date
                </span>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={
                    changeReportDate
                  }
                />
              </label>

              <label>
                <span>
                  Search staff
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Name, email or code"
                />
              </label>

            </div>

          </section>

          {/* ================= TABLES ================= */}

          <section className="dashboard-grid-two">

            <section className="table-card">

              <div className="section-title">

                <div>
                  <p className="eyebrow">
                    Live View
                  </p>

                  <h2>
                    Staff Attendance
                  </h2>
                </div>

                <span className="badge">
                  {filteredRows.length} records
                </span>

              </div>

              <div className="table-wrap">

                <table>

                  <thead>

                    <tr>
                      <th>
                        Employee
                      </th>

                      <th>
                        Department
                      </th>

                      <th>
                        Check in
                      </th>

                      <th>
                        Check out
                      </th>

                      <th>
                        Hours
                      </th>

                      <th>
                        Status
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {filteredRows.map(
                      (row) => (
                        <tr
                          key={
                            row.employee.id
                          }
                        >

                          <td>

                            <strong>
                              {
                                row
                                  .employee
                                  .name
                              }
                            </strong>

                            <small>
                              {
                                row
                                  .employee
                                  .employeeCode ||
                                row
                                  .employee
                                  .email
                              }
                            </small>

                          </td>

                          <td>
                            {
                              row
                                .employee
                                .department
                                ?.name ||
                              "Unassigned"
                            }
                          </td>

                          <td>
                            {formatTime(
                              row
                                .attendance
                                ?.checkInAt
                            )}
                          </td>

                          <td>
                            {formatTime(
                              row
                                .attendance
                                ?.checkOutAt
                            )}
                          </td>

                          <td>
                            {formatMinutes(
                              row
                                .attendance
                                ?.workedMinutes
                            )}
                          </td>

                          <td>

                            <span
                              className={statusClass(
                                row.status
                              )}
                            >
                              {statusLabel(
                                row.status
                              )}
                            </span>

                          </td>

                        </tr>
                      )
                    )}

                    {!loading &&
                      filteredRows.length ===
                        0 && (
                        <tr>

                          <td colSpan="6">

                            <div className="empty-state">
                              No staff match your
                              search.
                            </div>

                          </td>

                        </tr>
                      )}

                  </tbody>

                </table>

              </div>

            </section>

            {/* ================= DEPARTMENTS ================= */}

            <section className="table-card">

              <div className="section-title">

                <div>

                  <p className="eyebrow">
                    Departments
                  </p>

                  <h2>
                    Department Overview
                  </h2>

                </div>

              </div>

              <div className="department-list">

                {departmentSummary.map(
                  (department) => {

                    const active =
                      department.present +
                      department.late;

                    const rate =
                      department.total
                        ? Math.round(
                            (active /
                              department.total) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        className="department-item"
                        key={
                          department.name
                        }
                      >

                        <div className="department-top">

                          <strong>
                            {
                              department.name
                            }
                          </strong>

                          <span>
                            {rate}%
                          </span>

                        </div>

                        <div className="progress-track">

                          <div
                            className="progress-bar"
                            style={{
                              width: `${rate}%`,
                            }}
                          />

                        </div>

                        <div className="department-meta">

                          <span>
                            {
                              department.total
                            }{" "}
                            staff
                          </span>

                          <span>
                            {
                              department.present
                            }{" "}
                            present
                            {" · "}
                            {
                              department.late
                            }{" "}
                            late
                          </span>

                        </div>

                      </div>
                    );
                  }
                )}

                {!loading &&
                  departmentSummary.length ===
                    0 && (
                    <div className="empty-state">
                      No department data
                      available.
                    </div>
                  )}

              </div>

            </section>

          </section>

          {/* ================= ADMIN ACTIONS ================= */}

          <section className="dashboard-grid-two">

            <section className="table-card">

              <div className="section-title">

                <div>

                  <p className="eyebrow">
                    Management
                  </p>

                  <h2>
                    Admin Quick Actions
                  </h2>

                </div>

              </div>

              <div className="quick-actions">

                <Link
                  className="quick-action"
                  to="/employees"
                >
                  <strong>
                    Employees
                  </strong>

                  <span>
                    View and manage
                    organisation staff.
                  </span>
                </Link>

                <Link
                  className="quick-action"
                  to="/attendance"
                >
                  <strong>
                    Attendance Report
                  </strong>

                  <span>
                    Open the complete
                    attendance monitor.
                  </span>
                </Link>

                <Link
                  className="quick-action"
                  to="/reports"
                >
                  <strong>
                    Reports & Analytics
                  </strong>

                  <span>
                    Analyse attendance
                    trends and working
                    hours.
                  </span>
                </Link>

              </div>

            </section>

            {/* ================= OWNER PROFILE ================= */}

            <section className="table-card">

              <div className="section-title">

                <div>

                  <p className="eyebrow">
                    Your Account
                  </p>

                  <h2>
                    Owner Profile
                  </h2>

                </div>

              </div>

              <div className="profile-heading compact-profile">

                <div className="avatar">
                  {user?.name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "U"}
                </div>

                <div>

                  <h2>
                    {user?.name ||
                      "Owner"}
                  </h2>

                  <p>
                    {user?.email ||
                      "No email available"}
                  </p>

                </div>

              </div>

              <div className="detail-stats">

                <p>
                  <strong>
                    Role:
                  </strong>{" "}
                  {user?.role
                    ?.replaceAll(
                      "_",
                      " "
                    ) ||
                    "Administrator"}
                </p>

                <p>
                  <strong>
                    Attendance:
                  </strong>{" "}
                  <span className="status active">
                    Not Required
                  </span>
                </p>

                <p className="muted">
                  Owner accounts are excluded
                  from attendance calculations.
                </p>

              </div>

            </section>

          </section>
        </>
      ) : (
        <>
          {/* ==================================================
              EMPLOYEE / MANAGER DASHBOARD
              ================================================== */}

          <section className="dashboard-overview employee-overview">

            <article className="overview-card">

              <span>
                Today's Status
              </span>

              <strong>
                {loading
                  ? "Loading..."
                  : statusLabel(
                      today?.status
                    )}
              </strong>

              <small>
                Your current attendance
                status
              </small>

            </article>

            <article className="overview-card">

              <span>
                Check-in
              </span>

              <strong>
                {loading
                  ? "—"
                  : formatTime(
                      today?.checkInAt
                    )}
              </strong>

              <small>
                Time you started work
              </small>

            </article>

            <article className="overview-card">

              <span>
                Check-out
              </span>

              <strong>
                {loading
                  ? "—"
                  : formatTime(
                      today?.checkOutAt
                    )}
              </strong>

              <small>
                Time you finished work
              </small>

            </article>

            <article className="overview-card">

              <span>
                Monthly Attendance
              </span>

              <strong>
                {loading
                  ? "—"
                  : `${monthlyRate}%`}
              </strong>

              <small>
                {monthlyRecords.length}{" "}
                recorded workdays
              </small>

            </article>

          </section>

          <section className="dashboard-layout">

            <div className="dashboard-main">

              {/* ================= DAILY ATTENDANCE ================= */}

              <section className="card attendance-card">

                <div className="section-title">

                  <div>

                    <p className="eyebrow">
                      Daily Record
                    </p>

                    <h2>
                      My Attendance
                    </h2>

                  </div>

                  <span
                    className={statusClass(
                      today?.status
                    )}
                  >
                    {loading
                      ? "Loading"
                      : statusLabel(
                          today?.status
                        )}
                  </span>

                </div>

                <p>
                  Mark your attendance when
                  you start or finish your
                  workday.
                </p>

                <div className="attendance-times">

                  <span>
                    Check in

                    <strong>
                      {formatTime(
                        today?.checkInAt
                      )}
                    </strong>
                  </span>

                  <span>
                    Check out

                    <strong>
                      {formatTime(
                        today?.checkOutAt
                      )}
                    </strong>
                  </span>

                  <span>
                    Worked

                    <strong>
                      {formatMinutes(
                        today?.workedMinutes
                      )}
                    </strong>
                  </span>

                </div>

                <div className="attendance-actions">

                  {!checkedIn && (
                    <button
                      onClick={() =>
                        handleAttendanceAction(
                          "check-in"
                        )
                      }
                      disabled={
                        actionLoading ||
                        loading
                      }
                    >
                      {actionLoading
                        ? "Processing..."
                        : "Check in"}
                    </button>
                  )}

                  {checkedIn &&
                    !attendanceCompleted && (
                      <button
                        onClick={() =>
                          handleAttendanceAction(
                            "check-out"
                          )
                        }
                        disabled={
                          actionLoading ||
                          loading
                        }
                      >
                        {actionLoading
                          ? "Processing..."
                          : "Check out"}
                      </button>
                    )}

                  {attendanceCompleted && (
                    <p className="success">
                      Your attendance is
                      complete for today.
                    </p>
                  )}

                </div>

              </section>

              {/* ================= HISTORY ================= */}

              <section className="table-card">

                <div className="section-title">

                  <div>

                    <p className="eyebrow">
                      Recent Records
                    </p>

                    <h2>
                      Attendance History
                    </h2>

                  </div>

                  <Link
                    className="text-link"
                    to="/attendance/me"
                  >
                    View all
                  </Link>

                </div>

                <div className="table-wrap">

                  <table>

                    <thead>

                      <tr>
                        <th>
                          Date
                        </th>

                        <th>
                          Check in
                        </th>

                        <th>
                          Check out
                        </th>

                        <th>
                          Worked
                        </th>

                        <th>
                          Status
                        </th>
                      </tr>

                    </thead>

                    <tbody>

                      {history
                        .slice(0, 7)
                        .map((record) => (
                          <tr
                            key={record.id}
                          >

                            <td>
                              {formatDate(
                                record.workDate
                              )}
                            </td>

                            <td>
                              {formatTime(
                                record.checkInAt
                              )}
                            </td>

                            <td>
                              {formatTime(
                                record.checkOutAt
                              )}
                            </td>

                            <td>
                              {formatMinutes(
                                record.workedMinutes
                              )}
                            </td>

                            <td>

                              <span
                                className={statusClass(
                                  record.status
                                )}
                              >
                                {statusLabel(
                                  record.status
                                )}
                              </span>

                            </td>

                          </tr>
                        ))}

                      {!loading &&
                        history.length ===
                          0 && (
                          <tr>

                            <td colSpan="5">

                              <div className="empty-state">
                                No attendance
                                history yet.
                              </div>

                            </td>

                          </tr>
                        )}

                    </tbody>

                  </table>

                </div>

              </section>

            </div>

            {/* ================= SIDEBAR ================= */}

            <aside className="dashboard-side">

              <section className="table-card">

                <div className="section-title">
                  <h2>
                    My Profile
                  </h2>
                </div>

                <div className="profile-heading compact-profile">

                  <div className="avatar">
                    {user?.name
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "U"}
                  </div>

                  <div>

                    <h2>
                      {user?.name ||
                        "User"}
                    </h2>

                    <p>
                      {user?.email ||
                        "No email available"}
                    </p>

                  </div>

                </div>

                <div className="detail-stats">

                  <p>
                    <strong>
                      Role:
                    </strong>{" "}
                    {user?.role
                      ?.replaceAll(
                        "_",
                        " "
                      ) ||
                      "Employee"}
                  </p>

                  <p>
                    <strong>
                      Monthly records:
                    </strong>{" "}
                    {monthlyRecords.length}
                  </p>

                  <p>
                    <strong>
                      Monthly present:
                    </strong>{" "}
                    {monthlyPresent}
                  </p>

                </div>

              </section>

              <section className="table-card">

                <div className="section-title">

                  <h2>
                    Quick Actions
                  </h2>

                </div>

                <div className="quick-actions single-column">

                  <Link
                    className="quick-action"
                    to="/"
                  >
                    <strong>
                      My Dashboard
                    </strong>

                    <span>
                      View today's
                      attendance.
                    </span>
                  </Link>

                  <Link
                    className="quick-action"
                    to="/attendance/me"
                  >
                    <strong>
                      My History
                    </strong>

                    <span>
                      View your complete
                      attendance history.
                    </span>
                  </Link>

                </div>

              </section>

            </aside>

          </section>
        </>
      )}
    </main>
  );
}