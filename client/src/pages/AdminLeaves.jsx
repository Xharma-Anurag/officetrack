import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  });

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    loadLeaves();
  }, []);

  async function loadLeaves() {
    try {
      setLoading(true);
      setMessage("");

      const response = await api.get("/leaves");

      setLeaves(response.data.leaves || []);

      setSummary(
        response.data.summary || {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
        }
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.response?.data?.message ||
          "Unable to load leave requests."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(leave, decision) {
    let comment = "";

    if (decision === "reject") {
      comment =
        window.prompt(
          "Enter reason for rejecting this leave:"
        ) || "";
    } else {
      comment =
        window.prompt(
          "Optional approval comment:"
        ) || "";
    }

    try {
      setActionLoading(`${decision}-${leave.id}`);
      setMessage("");

      const endpoint =
        decision === "approve"
          ? `/leaves/${leave.id}/approve`
          : `/leaves/${leave.id}/reject`;

      await api.patch(endpoint, {
        comment,
      });

      setMessageType("success");

      setMessage(
        decision === "approve"
          ? `${leave.employee?.name || "Employee"}'s leave approved successfully.`
          : `${leave.employee?.name || "Employee"}'s leave rejected successfully.`
      );

      await loadLeaves();
    } catch (error) {
      setMessageType("error");

      setMessage(
        error.response?.data?.message ||
          `Unable to ${decision} leave.`
      );
    } finally {
      setActionLoading("");
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatType(type) {
    if (!type) return "—";

    return type
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function getStatusClass(status) {
    return `admin-leave-status ${String(status || "")
      .toLowerCase()
      .replaceAll("_", "-")}`;
  }

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const statusMatch =
        statusFilter === "ALL" ||
        leave.status === statusFilter;

      const typeMatch =
        typeFilter === "ALL" ||
        leave.type === typeFilter;

      return statusMatch && typeMatch;
    });
  }, [leaves, statusFilter, typeFilter]);

  return (
    <main className="shell admin-leaves-page">

      {/* Header */}
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            HR MANAGEMENT
          </p>

          <h1>Leave Requests</h1>

          <p>
            Review and manage employee leave
            applications from one place.
          </p>
        </div>

        <button
          className="secondary"
          onClick={loadLeaves}
          disabled={loading}
        >
          ↻ {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {/* Message */}
      {message && (
        <div
          className={
            messageType === "error"
              ? "error admin-leave-message"
              : "success admin-leave-message"
          }
        >
          {message}
        </div>
      )}

      {/* Summary */}
      <section className="admin-leave-stats">

        <div className="admin-leave-stat">
          <span>Total Requests</span>
          <strong>{summary.total}</strong>
          <small>All applications</small>
        </div>

        <div className="admin-leave-stat pending">
          <span>Pending</span>
          <strong>{summary.pending}</strong>
          <small>Needs review</small>
        </div>

        <div className="admin-leave-stat approved">
          <span>Approved</span>
          <strong>{summary.approved}</strong>
          <small>Approved leaves</small>
        </div>

        <div className="admin-leave-stat rejected">
          <span>Rejected</span>
          <strong>{summary.rejected}</strong>
          <small>Rejected requests</small>
        </div>

        <div className="admin-leave-stat cancelled">
          <span>Cancelled</span>
          <strong>{summary.cancelled}</strong>
          <small>Cancelled requests</small>
        </div>

      </section>

      {/* Filters */}
      <section className="admin-leave-filters">

        <div>
          <label>Status</label>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="ALL">
              All Status
            </option>

            <option value="PENDING">
              Pending
            </option>

            <option value="APPROVED">
              Approved
            </option>

            <option value="REJECTED">
              Rejected
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>
          </select>
        </div>

        <div>
          <label>Leave Type</label>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value)
            }
          >
            <option value="ALL">
              All Types
            </option>

            <option value="CASUAL">
              Casual
            </option>

            <option value="SICK">
              Sick
            </option>

            <option value="ANNUAL">
              Annual
            </option>

            <option value="UNPAID">
              Unpaid
            </option>
          </select>
        </div>

        <div className="admin-leave-filter-info">
          Showing{" "}
          <strong>{filteredLeaves.length}</strong>{" "}
          of{" "}
          <strong>{leaves.length}</strong>{" "}
          requests
        </div>

      </section>

      {/* Table */}
      <section className="admin-leave-table-card">

        <div className="admin-leave-table-header">

          <div>
            <p className="eyebrow">
              EMPLOYEE MANAGEMENT
            </p>

            <h2>
              Employee Leave Applications
            </h2>

            <p>
              Review pending requests and manage
              employee leave decisions.
            </p>
          </div>

        </div>

        {loading ? (

          <div className="admin-leave-empty">
            <div className="admin-leave-empty-icon">
              …
            </div>

            <h3>
              Loading requests
            </h3>

            <p>
              Fetching employee leave applications.
            </p>
          </div>

        ) : filteredLeaves.length === 0 ? (

          <div className="admin-leave-empty">

            <div className="admin-leave-empty-icon">
              ✓
            </div>

            <h3>
              No leave requests
            </h3>

            <p>
              No applications match the selected
              filters.
            </p>

          </div>

        ) : (

          <div className="admin-leave-table-wrapper">

            <table className="admin-leave-table">

              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {filteredLeaves.map((leave) => {

                  const isPending =
                    leave.status === "PENDING";

                  const approving =
                    actionLoading ===
                    `approve-${leave.id}`;

                  const rejecting =
                    actionLoading ===
                    `reject-${leave.id}`;

                  return (
                    <tr key={leave.id}>

                      {/* Employee */}
                      <td>
                        <div className="admin-employee-cell">

                          <div className="admin-employee-avatar">
                            {leave.employee?.name
                              ?.charAt(0)
                              ?.toUpperCase() || "E"}
                          </div>

                          <div>

                            <strong>
                              {leave.employee?.name ||
                                "Unknown Employee"}
                            </strong>

                            <span>
                              {leave.employee
                                ?.employeeCode ||
                                leave.employee?.email ||
                                "—"}
                            </span>

                            {leave.employee
                              ?.department?.name && (
                              <small>
                                {
                                  leave.employee
                                    .department.name
                                }
                              </small>
                            )}

                          </div>

                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <span className="admin-leave-type">
                          {formatType(leave.type)}
                        </span>
                      </td>

                      {/* Dates */}
                      <td>
                        <div className="admin-leave-dates">

                          <strong>
                            {formatDate(
                              leave.startDate
                            )}
                          </strong>

                          <span>
                            to
                          </span>

                          <strong>
                            {formatDate(
                              leave.endDate
                            )}
                          </strong>

                        </div>
                      </td>

                      {/* Days */}
                      <td>
                        <span className="admin-leave-days">
                          {leave.days}{" "}
                          {leave.days === 1
                            ? "day"
                            : "days"}
                        </span>
                      </td>

                      {/* Reason */}
                      <td>
                        <div className="admin-leave-reason">
                          {leave.reason || "No reason provided"}
                        </div>

                        {leave.approvalComment && (
                          <small className="admin-leave-comment">
                            {leave.approvalComment}
                          </small>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={getStatusClass(
                            leave.status
                          )}
                        >
                          {formatType(
                            leave.status
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>

                        {isPending ? (

                          <div className="admin-leave-actions">

                            <button
                              className="admin-approve-btn"
                              onClick={() =>
                                handleDecision(
                                  leave,
                                  "approve"
                                )
                              }
                              disabled={
                                approving ||
                                rejecting
                              }
                            >
                              {approving
                                ? "Approving..."
                                : "Approve"}
                            </button>

                            <button
                              className="admin-reject-btn"
                              onClick={() =>
                                handleDecision(
                                  leave,
                                  "reject"
                                )
                              }
                              disabled={
                                approving ||
                                rejecting
                              }
                            >
                              {rejecting
                                ? "Rejecting..."
                                : "Reject"}
                            </button>

                          </div>

                        ) : (

                          <div className="admin-leave-approved-by">

                            {leave.approver?.name
                              ? `By ${leave.approver.name}`
                              : "Completed"}

                          </div>

                        )}

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