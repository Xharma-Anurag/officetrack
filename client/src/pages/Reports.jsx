import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import "./reports.css";

function formatHours(minutes = 0) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function formatDate(date) {
  if (!date) return "-";
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function percentage(value, total) {
  return total ? Math.min(100, (value / total) * 100) : 0;
}

export default function Reports() {
  const defaultRange = getMonthRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [error, setError] = useState("");

  async function loadReports(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      setError("");

      const response = await api.get("/attendance/analytics", {
        params: { from, to },
      });
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Unable to load attendance analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const departments = useMemo(() => {
    const names = (data?.employees || [])
      .map((employee) => employee.department?.name)
      .filter(Boolean);
    return [...new Set(names)].sort();
  }, [data]);

  const filteredEmployees = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    return (data?.employees || []).filter((employee) => {
      const matchesSearch =
        !searchText ||
        employee.name?.toLowerCase().includes(searchText) ||
        employee.employeeCode?.toLowerCase().includes(searchText) ||
        employee.email?.toLowerCase().includes(searchText);

      const matchesDepartment =
        department === "ALL" || employee.department?.name === department;

      return matchesSearch && matchesDepartment;
    });
  }, [data, search, department]);

  function resetFilters() {
    const range = getMonthRange();
    setFrom(range.from);
    setTo(range.to);
    setSearch("");
    setDepartment("ALL");
    setTimeout(() => loadReports(), 0);
  }

  const summary = data?.summary || {};
  const dailyTrend = data?.dailyTrend || [];
  const distributionTotal =
    (summary.present || 0) +
    (summary.late || 0) +
    (summary.missingCheckout || 0) +
    (summary.absent || 0);

  if (loading) {
    return (
      <div className="reports-page">
        <div className="reports-loading">
          <div className="reports-spinner" />
          <strong>Loading analytics</strong>
          <p>Preparing your attendance report...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="reports-page">
        <div className="reports-error-state">
          <div className="reports-error-icon">!</div>
          <h2>Unable to load reports</h2>
          <p>{error}</p>
          <button onClick={() => loadReports()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <header className="reports-hero">
        <div className="reports-hero-copy">
          <div className="reports-hero-icon">▦</div>
          <div>
            <span className="reports-eyebrow">HR ANALYTICS</span>
            <h1>Attendance Reports</h1>
            <p>Track workforce attendance, working hours and daily performance.</p>
          </div>
        </div>

        <button
          className="reports-refresh-btn"
          onClick={() => loadReports(false)}
          disabled={refreshing}
        >
          <span>↻</span>{refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </header>

      <section className="reports-filter-card">
        <div className="reports-filter-heading">
          <span className="reports-filter-icon">⌁</span>
          <div>
            <strong>Report period</strong>
            <small>Choose the attendance period you want to analyse</small>
          </div>
        </div>

        <div className="reports-filter-fields">
          <label>
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="reports-apply-btn" onClick={() => loadReports()}>
            Apply filter
          </button>
          <button className="reports-reset-btn" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </section>

      {error && <div className="reports-inline-error">{error}</div>}

      <div className="reports-period-row">
        <div>
          <span>Reporting period</span>
          <strong>{formatDate(data?.range?.from)} — {formatDate(data?.range?.to)}</strong>
        </div>
        <span className="reports-period-pill">{data?.range?.totalDays || 0} days</span>
      </div>

      <section className="reports-kpi-grid">
        <article className="reports-kpi">
          <div className="reports-kpi-icon blue">◉</div>
          <div><span>Total employees</span><strong>{summary.totalEmployees || 0}</strong><small>Active workforce</small></div>
        </article>
        <article className="reports-kpi">
          <div className="reports-kpi-icon green">✓</div>
          <div><span>Present</span><strong>{summary.present || 0}</strong><small>On-time attendance</small></div>
        </article>
        <article className="reports-kpi">
          <div className="reports-kpi-icon amber">◷</div>
          <div><span>Late</span><strong>{summary.late || 0}</strong><small>Late check-ins</small></div>
        </article>
        <article className="reports-kpi">
          <div className="reports-kpi-icon red">!</div>
          <div><span>Missing checkout</span><strong>{summary.missingCheckout || 0}</strong><small>Needs attention</small></div>
        </article>
        <article className="reports-kpi reports-kpi-highlight">
          <div className="reports-kpi-icon indigo">%</div>
          <div><span>Attendance rate</span><strong>{summary.attendancePercentage || 0}%</strong><small>Across selected period</small></div>
        </article>
        <article className="reports-kpi">
          <div className="reports-kpi-icon purple">◴</div>
          <div><span>Avg. working time</span><strong>{formatHours(summary.averageWorkingMinutes)}</strong><small>Per attended day</small></div>
        </article>
      </section>

      <div className="reports-main-grid">
        <section className="reports-card reports-trend-card">
          <div className="reports-card-header">
            <div>
              <span className="reports-section-label">PERFORMANCE</span>
              <h2>Attendance trend</h2>
              <p>Daily attendance percentage for the selected period.</p>
            </div>
            <span className="reports-chart-badge">Daily</span>
          </div>

          <div className="reports-chart">
            {dailyTrend.length === 0 ? (
              <div className="reports-empty">No attendance data available.</div>
            ) : (
              <div className="reports-chart-area">
                <div className="reports-chart-yaxis">
                  <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                </div>
                <div className="reports-chart-content">
                  <div className="reports-chart-lines"><i /><i /><i /><i /><i /></div>
                  <div className="reports-bars">
                    {dailyTrend.map((day) => {
                      const value = Number(day.attendancePercentage || 0);
                      return (
                        <div className="reports-bar-column" key={day.date} title={`${formatDate(day.date)} — ${value}%`}>
                          <span className="reports-bar-value">{value}%</span>
                          <div className="reports-bar-track"><div className="reports-bar-fill" style={{ height: `${Math.max(3, value)}%` }} /></div>
                          <span className="reports-bar-date">{new Date(`${day.date}T00:00:00`).getDate()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="reports-card reports-distribution-card">
          <div className="reports-card-header">
            <div>
              <span className="reports-section-label">BREAKDOWN</span>
              <h2>Attendance distribution</h2>
              <p>Status breakdown for the selected period.</p>
            </div>
          </div>

          <div className="reports-distribution-summary">
            <div className="reports-ring" style={{ "--rate": `${summary.attendancePercentage || 0}` }}>
              <div><strong>{summary.attendancePercentage || 0}%</strong><span>Attendance</span></div>
            </div>
            <div className="reports-distribution-note">
              <strong>{(summary.present || 0) + (summary.late || 0) + (summary.missingCheckout || 0)}</strong>
              <span>attendance records</span>
            </div>
          </div>

          <div className="reports-progress-list">
            {[
              ["Present", summary.present || 0, "present"],
              ["Late", summary.late || 0, "late"],
              ["Missing checkout", summary.missingCheckout || 0, "missing"],
              ["Absent", summary.absent || 0, "absent"],
            ].map(([label, value, type]) => (
              <div className="reports-progress-row" key={label}>
                <div className="reports-progress-label"><span>{label}</span><strong>{value}</strong></div>
                <div className="reports-progress-track"><div className={`reports-progress-fill ${type}`} style={{ width: `${percentage(value, distributionTotal)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="reports-card reports-employee-card">
        <div className="reports-table-header">
          <div>
            <span className="reports-section-label">WORKFORCE</span>
            <h2>Employee attendance</h2>
            <p>Individual attendance performance for the selected period.</p>
          </div>
          <div className="reports-table-count"><strong>{filteredEmployees.length}</strong><span>employees</span></div>
        </div>

        <div className="reports-table-filters">
          <div className="reports-search">
            <span>⌕</span>
            <input type="text" placeholder="Search employee, code or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="ALL">All departments</option>
            {departments.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        <div className="reports-table-wrapper">
          {filteredEmployees.length === 0 ? (
            <div className="reports-empty">No employees match the selected filters.</div>
          ) : (
            <table className="reports-table">
              <thead><tr><th>Employee</th><th>Department</th><th>Present</th><th>Late</th><th>Missing</th><th>Absent</th><th>Attendance</th><th>Avg. hours</th></tr></thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.employeeId}>
                    <td><div className="reports-employee"><div className="reports-avatar">{employee.name?.charAt(0)?.toUpperCase() || "U"}</div><div><strong>{employee.name}</strong><span>{employee.employeeCode}</span></div></div></td>
                    <td><span className="reports-department">{employee.department?.name || "Unassigned"}</span></td>
                    <td><span className="reports-number present">{employee.present}</span></td>
                    <td><span className="reports-number late">{employee.late}</span></td>
                    <td><span className="reports-number missing">{employee.missingCheckout}</span></td>
                    <td><span className="reports-number absent">{employee.absent}</span></td>
                    <td><div className="reports-attendance-cell"><strong>{employee.attendancePercentage}%</strong><div className="reports-mini-progress"><div style={{ width: `${Math.min(100, employee.attendancePercentage || 0)}%` }} /></div></div></td>
                    <td><strong className="reports-hours">{formatHours(employee.averageWorkingMinutes)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
