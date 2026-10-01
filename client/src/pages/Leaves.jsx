import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    approvedDays: 0,
  });

  const [form, setForm] = useState({
    type: "CASUAL",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  async function loadLeaves() {
    try {
      setLoading(true);

      const { data } = await api.get("/leaves/me");

      setLeaves(data.leaves || []);

      setSummary(
        data.summary || {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
          approvedDays: 0,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load leave requests."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaves();
  }, []);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function submitLeave(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (
      !form.startDate ||
      !form.endDate ||
      !form.reason.trim()
    ) {
      setError("Please fill all required fields.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    try {
      setSubmitting(true);

      const { data } = await api.post(
        "/leaves",
        form
      );

      setMessage(
        data.message ||
          "Leave request submitted successfully."
      );

      setForm({
        type: "CASUAL",
        startDate: "",
        endDate: "",
        reason: "",
      });

      await loadLeaves();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to submit leave request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelLeave(id) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this leave request?"
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const { data } = await api.patch(
        `/leaves/${id}/cancel`
      );

      setMessage(
        data.message ||
          "Leave request cancelled."
      );

      await loadLeaves();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to cancel leave request."
      );
    }
  }

  function formatDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatType(type) {
    return type
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letter) => letter.toUpperCase()
      );
  }

  function getStatusClass(status) {
    return `leave-badge ${status.toLowerCase()}`;
  }

  const filteredLeaves = useMemo(() => {
    if (filter === "ALL") {
      return leaves;
    }

    return leaves.filter(
      (leave) => leave.status === filter
    );
  }, [leaves, filter]);

  return (
    <div className="leave-page">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <div className="leave-page-header">
        <div>
          <div className="leave-eyebrow">
            EMPLOYEE PORTAL
          </div>

          <h1>Leave Management</h1>

          <p>
            Manage your time off, submit requests,
            and track approval status.
          </p>
        </div>

        <div className="leave-header-icon">
          📅
        </div>
      </div>


      {/* =========================
          ALERTS
      ========================= */}

      {message && (
        <div className="leave-alert leave-alert-success">
          <span>✓</span>
          <div>
            <strong>Success</strong>
            <p>{message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="leave-alert leave-alert-error">
          <span>!</span>
          <div>
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>
        </div>
      )}


      {/* =========================
          STAT CARDS
      ========================= */}

      <div className="leave-stats-grid">

        <div className="leave-stat-card">
          <div className="leave-stat-icon blue">
            📋
          </div>

          <div>
            <span>Total Requests</span>
            <strong>{summary.total}</strong>
          </div>
        </div>


        <div className="leave-stat-card">
          <div className="leave-stat-icon orange">
            ⏳
          </div>

          <div>
            <span>Pending</span>
            <strong>{summary.pending}</strong>
          </div>
        </div>


        <div className="leave-stat-card">
          <div className="leave-stat-icon green">
            ✓
          </div>

          <div>
            <span>Approved</span>
            <strong>{summary.approved}</strong>
          </div>
        </div>


        <div className="leave-stat-card">
          <div className="leave-stat-icon purple">
            🗓
          </div>

          <div>
            <span>Approved Days</span>
            <strong>
              {summary.approvedDays}
            </strong>
          </div>
        </div>

      </div>


      {/* =========================
          APPLY LEAVE
      ========================= */}

      <div className="leave-main-grid">

        <section className="leave-card apply-card">

          <div className="leave-card-title">
            <div className="leave-title-icon">
              +
            </div>

            <div>
              <h2>Apply for Leave</h2>
              <p>
                Submit a new request for approval.
              </p>
            </div>
          </div>


          <form
            className="leave-form"
            onSubmit={submitLeave}
          >

            <div className="leave-input-group">
              <label>Leave Type</label>

              <select
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option value="CASUAL">
                  Casual Leave
                </option>

                <option value="SICK">
                  Sick Leave
                </option>

                <option value="ANNUAL">
                  Annual Leave
                </option>

                <option value="UNPAID">
                  Unpaid Leave
                </option>
              </select>
            </div>


            <div className="leave-date-grid">

              <div className="leave-input-group">
                <label>Start Date</label>

                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                />
              </div>


              <div className="leave-input-group">
                <label>End Date</label>

                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                />
              </div>

            </div>


            <div className="leave-input-group">
              <div className="leave-label-row">
                <label>Reason</label>

                <span>
                  {form.reason.length}/500
                </span>
              </div>

              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Briefly explain the reason for your leave..."
                maxLength="500"
                rows="5"
              />
            </div>


            <button
              type="submit"
              className="leave-submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                "Submitting..."
              ) : (
                <>
                  Submit Leave Request
                  <span>→</span>
                </>
              )}
            </button>

          </form>

        </section>


        {/* =========================
            LEAVE INFORMATION
        ========================= */}

        <aside className="leave-card leave-info-card">

          <div className="leave-card-title">
            <div className="leave-title-icon info">
              i
            </div>

            <div>
              <h2>Leave Guidelines</h2>
              <p>
                Keep these points in mind.
              </p>
            </div>
          </div>


          <div className="leave-guideline">
            <span>01</span>

            <div>
              <strong>
                Submit in advance
              </strong>

              <p>
                Apply before your planned leave
                whenever possible.
              </p>
            </div>
          </div>


          <div className="leave-guideline">
            <span>02</span>

            <div>
              <strong>
                Wait for approval
              </strong>

              <p>
                A submitted request remains
                pending until reviewed.
              </p>
            </div>
          </div>


          <div className="leave-guideline">
            <span>03</span>

            <div>
              <strong>
                Check your status
              </strong>

              <p>
                Track approved, rejected and
                pending requests below.
              </p>
            </div>
          </div>


          <div className="leave-status-key">

            <div>
              <span className="dot pending-dot" />
              Pending
            </div>

            <div>
              <span className="dot approved-dot" />
              Approved
            </div>

            <div>
              <span className="dot rejected-dot" />
              Rejected
            </div>

          </div>

        </aside>

      </div>


      {/* =========================
          HISTORY
      ========================= */}

      <section className="leave-card history-card">

        <div className="history-header">

          <div>
            <h2>Leave History</h2>

            <p>
              Review all your submitted leave
              requests.
            </p>
          </div>


          <div className="leave-filters">

            {[
              ["ALL", "All"],
              ["PENDING", "Pending"],
              ["APPROVED", "Approved"],
              ["REJECTED", "Rejected"],
              ["CANCELLED", "Cancelled"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={
                  filter === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(value)
                }
              >
                {label}
              </button>
            ))}

          </div>

        </div>


        {loading ? (
          <div className="leave-loading">
            <div className="leave-loader" />
            Loading your leave history...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="leave-empty-state">

            <div className="empty-icon">
              📭
            </div>

            <h3>
              No leave requests found
            </h3>

            <p>
              Your leave requests will appear
              here once submitted.
            </p>

          </div>
        ) : (

          <div className="leave-table-container">

            <table className="leave-table">

              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {filteredLeaves.map(
                  (leave) => (
                    <tr key={leave.id}>

                      <td>
                        <div className="leave-type-cell">

                          <div className="leave-type-icon">
                            {leave.type ===
                            "SICK"
                              ? "♥"
                              : leave.type ===
                                "ANNUAL"
                              ? "✈"
                              : leave.type ===
                                "UNPAID"
                              ? "○"
                              : "☀"}
                          </div>

                          <div>
                            <strong>
                              {formatType(
                                leave.type
                              )}
                            </strong>

                            <small>
                              Leave request
                            </small>
                          </div>

                        </div>
                      </td>


                      <td>
                        <div className="date-cell">

                          <strong>
                            {formatDate(
                              leave.startDate
                            )}
                          </strong>

                          <span>to</span>

                          <strong>
                            {formatDate(
                              leave.endDate
                            )}
                          </strong>

                        </div>
                      </td>


                      <td>
                        <span className="days-pill">
                          {leave.days}{" "}
                          {leave.days === 1
                            ? "day"
                            : "days"}
                        </span>
                      </td>


                      <td>
                        <div className="reason-cell">
                          {leave.reason}

                          {leave.approvalComment && (
                            <div className="approval-note">
                              <strong>
                                Reviewer:
                              </strong>{" "}
                              {
                                leave.approvalComment
                              }
                            </div>
                          )}
                        </div>
                      </td>


                      <td>
                        <span
                          className={getStatusClass(
                            leave.status
                          )}
                        >
                          <span className="status-dot" />
                          {leave.status}
                        </span>
                      </td>


                      <td>

                        {leave.status ===
                          "PENDING" && (
                          <button
                            className="cancel-btn"
                            onClick={() =>
                              cancelLeave(
                                leave.id
                              )
                            }
                          >
                            Cancel
                          </button>
                        )}

                        {leave.status ===
                          "APPROVED" && (
                          <span className="action-muted">
                            Completed
                          </span>
                        )}

                        {leave.status ===
                          "REJECTED" && (
                          <span className="action-muted">
                            Closed
                          </span>
                        )}

                        {leave.status ===
                          "CANCELLED" && (
                          <span className="action-muted">
                            Cancelled
                          </span>
                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}