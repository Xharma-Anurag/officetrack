import React from 'react';
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";

const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
const formatHours = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const dateToday = new Date().toISOString().slice(0, 10);
const firstOfMonth = `${dateToday.slice(0, 8)}01`;

export default function EmployeeAttendance() {
  const { id } = useParams();
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(dateToday);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try { setError(""); setData((await api.get(`/employees/${id}/attendance`, { params: { from, to } })).data); }
    catch (err) { setError(err.response?.data?.message || "Unable to load employee attendance."); }
  }
  useEffect(() => { load(); }, [id]);
  const employee = data?.employee;
  const summary = data?.summary;

  return <main className="shell"><Link className="back-link" to="/attendance">← Back to attendance monitor</Link>{employee && <section className="profile-heading"><div className="avatar">{employee.name.slice(0, 1)}</div><div><p className="eyebrow">Employee attendance</p><h1>{employee.name}</h1><p>{employee.employeeCode} · {employee.department?.name || "Unassigned"} · {employee.role.replace("_", " ")}</p></div></section>}<section className="table-card"><div className="table-toolbar"><div><h2>Attendance history</h2><p>Select a date range to inspect check-in and check-out records.</p></div><div className="filters"><input type="date" value={from} onChange={event => setFrom(event.target.value)} /><input type="date" value={to} onChange={event => setTo(event.target.value)} /><button onClick={load}>Apply</button></div></div>{summary && <section className="stats detail-stats"><article><span>Days recorded</span><strong>{summary.daysRecorded}</strong></article><article className="present"><span>Present</span><strong>{summary.present}</strong></article><article className="late"><span>Late</span><strong>{summary.late}</strong></article><article className="missing"><span>Missing checkout</span><strong>{summary.missingCheckout}</strong></article><article><span>Time worked</span><strong>{formatHours(summary.totalWorkedMinutes)}</strong></article></section>}{error && <p className="error">{error}</p>}<div className="table-wrap"><table><thead><tr><th>Date</th><th>Check in</th><th>Check out</th><th>Worked</th><th>Source</th><th>Status</th></tr></thead><tbody>{data?.attendance.map(record => <tr key={record.id}><td>{new Date(record.workDate).toLocaleDateString()}</td><td>{formatTime(record.checkInAt)}</td><td>{formatTime(record.checkOutAt)}</td><td>{record.workedMinutes != null ? formatHours(record.workedMinutes) : "—"}</td><td>{record.source}</td><td><span className={`status ${record.status.toLowerCase().replace("_", "-")}`}>{record.status.replace("_", " ")}</span></td></tr>)}</tbody></table>{data?.attendance.length === 0 && <p className="empty-state">No attendance was recorded in this date range.</p>}</div></section></main>;
}
