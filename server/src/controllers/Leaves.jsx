import React, { useEffect, useState } from "react";
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

  function getStatusClass(status) {
    switch (status) {
      case "APPROVED":
        return "leave-status approved";

      case "REJECTED":
        return "leave-status rejected";

      case "CANCELLED":
        return "leave-status cancelled";

      default:
        return "leave-status pending";
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

  return (
    <div className="leave-page">
      <div className="leave-header">
        <div>
          <h1>Leave Management</h1>

          <p>
            Apply for leave and track your
            requests.
          </p>
        </div>
      </div>

      {message && (
        <div className="leave-alert success">
          {message}
        </div>
      )}

      {error && (
        <div className="leave-alert error">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div className="leave-summary">
        <div className="leave-stat">
          <span>Total Requests</span>
          <strong>{summary.total}</strong>
        </div>

        <div className="leave-stat">
          <span>Pending</span>
          <strong>{summary.pending}</strong>
        </div>

        <div className="leave-stat">
          <span>Approved</span>
          <strong>{summary.approved}</strong>
        </div>

        <div className="leave-stat">
          <span>Approved Days</span>
          <strong>
            {summary.approvedDays}
          </strong>
        </div>
      </div>

      {/* APPLY FORM */}

      <div className="leave-card">
        <div className="leave-card-header">
          <div>
            <h2>Apply for Leave</h2>

            <p>
              Submit a new leave request for
              approval.
            </p>
          </div>
        </div>

        <form
          className="leave-form"
          onSubmit={submitLeave}
        >
          <div className="leave-form-grid">
            <div className="leave-field">
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

            <div className="leave-field">
              <label>Start Date</label>

              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
              />
            </div>

            <div className="leave-field">
              <label>End Date</label>

              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
              />
            </div>

            <div className="leave-field full">
              <label>Reason</label>

              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Enter reason for leave..."
                rows="4"
                maxLength="500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="leave-submit"
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : "Apply for Leave"}
          </button>
        </form>
      </div>

      {/* HISTORY */}

      <div className="leave-card">
        <div className="leave-card-header">
          <div>
            <h2>Leave History</h2>

            <p>
              View your previous and current
              leave requests.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="leave-empty">
            Loading leave history...
          </div>
        ) : leaves.length === 0 ? (
          <div className="leave-empty">
            <h3>No leave requests yet</h3>

            <p>
              Your submitted leave requests
              will appear here.
            </p>
          </div>
        ) : (
          <div className="leave-table-wrapper">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.id}>
                    <td>
                      <strong>
                        {formatType(leave.type)}
                      </strong>
                    </td>

                    <td>
                      {formatDate(
                        leave.startDate
                      )}
                      <br />
                      <span className="date-separator">
                        to
                      </span>
                      <br />
                      {formatDate(
                        leave.endDate
                      )}
                    </td>

                    <td>
                      {leave.days}
                    </td>

                    <td>
                      <span className="leave-reason">
                        {leave.reason}
                      </span>

                      {leave.approvalComment && (
                        <div className="approval-comment">
                          <strong>
                            Admin:
                          </strong>{" "}
                          {
                            leave.approvalComment
                          }
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        className={getStatusClass(
                          leave.status
                        )}
                      >
                        {leave.status}
                      </span>
                    </td>

                    <td>
                      {leave.status ===
                        "PENDING" && (
                        <button
                          className="leave-cancel"
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
                        <span className="muted">
                          Approved
                        </span>
                      )}

                      {leave.status ===
                        "REJECTED" && (
                        <span className="muted">
                          Closed
                        </span>
                      )}

                      {leave.status ===
                        "CANCELLED" && (
                        <span className="muted">
                          Cancelled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}