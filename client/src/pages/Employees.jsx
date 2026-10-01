import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  email: "",
  employeeCode: "",
  password: "",
  role: "EMPLOYEE",
};

export default function Employees() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/employees");

      setUsers(response.data.users || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load employees."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingUser(null);
    setShowCreate(false);
    setShowEdit(false);
  }

  function openCreate() {
    setMessage("");
    setError("");
    setForm(emptyForm);
    setEditingUser(null);
    setShowCreate(true);
    setShowEdit(false);
  }

  function openEdit(employee) {
    setMessage("");
    setError("");

    setEditingUser(employee);

    setForm({
      name: employee.name || "",
      email: employee.email || "",
      employeeCode: employee.employeeCode || "",
      password: "",
      role: employee.role || "EMPLOYEE",
    });

    setShowEdit(true);
    setShowCreate(false);
  }

  async function createEmployee(event) {
    event.preventDefault();

    setMessage("");
    setError("");
    setSaving(true);

    try {
      await api.post("/employees", form);

      setMessage("Employee account created successfully.");

      resetForm();

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create employee."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateEmployee(event) {
    event.preventDefault();

    if (!editingUser) return;

    setMessage("");
    setError("");
    setSaving(true);

    try {
      await api.put(
        `/employees/${editingUser.id}`,
        {
          name: form.name,
          email: form.email,
          employeeCode: form.employeeCode,
          role: form.role,
        }
      );

      setMessage("Employee updated successfully.");

      resetForm();

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update employee."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(employee) {
    const nextStatus =
      employee.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    const action =
      nextStatus === "ACTIVE"
        ? "activate"
        : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${employee.name}?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      await api.patch(
        `/employees/${employee.id}/status`,
        {
          status: nextStatus,
        }
      );

      setMessage(
        nextStatus === "ACTIVE"
          ? `${employee.name} has been activated.`
          : `${employee.name} has been deactivated.`
      );

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update employee status."
      );
    }
  }

  async function deleteEmployee(employee) {
    if (currentUser?.role !== "SUPER_ADMIN") {
      setError(
        "Only a Super Admin can permanently delete employees."
      );
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${employee.name}? This cannot be undone.`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      await api.delete(`/employees/${employee.id}`);

      setMessage(
        `${employee.name} was permanently deleted.`
      );

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete employee."
      );
    }
  }

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    return users.filter((employee) => {
      const matchesSearch =
        !value ||
        employee.name?.toLowerCase().includes(value) ||
        employee.email?.toLowerCase().includes(value) ||
        employee.employeeCode
          ?.toLowerCase()
          .includes(value);

      const matchesStatus =
        statusFilter === "ALL" ||
        employee.status === statusFilter;

      const matchesRole =
        roleFilter === "ALL" ||
        employee.role === roleFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRole
      );
    });
  }, [users, search, statusFilter, roleFilter]);

  return (
    <main className="shell">
      <section className="page-heading">
        <div>
          <p className="eyebrow">ORGANISATION</p>

          <h1>Employees</h1>

          <p>
            Create, manage and control employee access.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
        >
          + Add Employee
        </button>
      </section>

      {message && (
        <div className="success">
          {message}
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* CREATE / EDIT FORM */}

      {(showCreate || showEdit) && (
        <section className="card form-card employee-form">
          <div className="form-header">
            <div>
              <p className="eyebrow">
                {showEdit ? "EDIT EMPLOYEE" : "NEW EMPLOYEE"}
              </p>

              <h2>
                {showEdit
                  ? "Edit employee"
                  : "Add employee"}
              </h2>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
            >
              Cancel
            </button>
          </div>

          <form
            onSubmit={
              showEdit
                ? updateEmployee
                : createEmployee
            }
          >
            <div className="form-grid">
              <input
                value={form.name}
                onChange={(e) =>
                  update("name", e.target.value)
                }
                placeholder="Full name"
                required
              />

              <input
                value={form.email}
                onChange={(e) =>
                  update("email", e.target.value)
                }
                placeholder="Work email"
                type="email"
                required
              />

              <input
                value={form.employeeCode}
                onChange={(e) =>
                  update(
                    "employeeCode",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Employee code"
                required
              />

              {!showEdit && (
                <input
                  value={form.password}
                  onChange={(e) =>
                    update("password", e.target.value)
                  }
                  placeholder="Temporary password"
                  type="password"
                  minLength="8"
                  required
                />
              )}

              <select
                value={form.role}
                onChange={(e) =>
                  update("role", e.target.value)
                }
              >
                <option value="EMPLOYEE">
                  Employee
                </option>

                <option value="MANAGER">
                  Manager
                </option>

                <option value="HR_ADMIN">
                  HR Admin
                </option>

                {currentUser?.role === "SUPER_ADMIN" && (
                  <option value="SUPER_ADMIN">
                    Super Admin
                  </option>
                )}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : showEdit
                ? "Save Changes"
                : "Create Employee"}
            </button>
          </form>
        </section>
      )}

      {/* FILTERS */}

      <section className="card employee-filters">
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search by name, email or employee code..."
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="ALL">
            All Status
          </option>

          <option value="ACTIVE">
            Active
          </option>

          <option value="INACTIVE">
            Inactive
          </option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) =>
            setRoleFilter(e.target.value)
          }
        >
          <option value="ALL">
            All Roles
          </option>

          <option value="EMPLOYEE">
            Employee
          </option>

          <option value="MANAGER">
            Manager
          </option>

          <option value="HR_ADMIN">
            HR Admin
          </option>

          <option value="SUPER_ADMIN">
            Super Admin
          </option>
        </select>
      </section>

      {/* EMPLOYEE TABLE */}

      <section className="table-card">
        <div className="table-card-header">
          <div>
            <p className="eyebrow">
              PEOPLE
            </p>

            <h2>
              Employee Accounts
            </h2>
          </div>

          <span className="badge">
            {filteredUsers.length} / {users.length}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading employees...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <h3>No employees found</h3>

            <p>
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>
                        {employee.name}
                      </strong>

                      <small>
                        {employee.email}
                      </small>
                    </td>

                    <td>
                      {employee.employeeCode}
                    </td>

                    <td>
                      {employee.role
                        ?.replaceAll("_", " ")}
                    </td>

                    <td>
                      {employee.department?.name ||
                        "—"}
                    </td>

                    <td>
                      {employee.shift?.name ||
                        "—"}
                    </td>

                    <td>
                      <span
                        className={
                          employee.status ===
                          "ACTIVE"
                            ? "status active"
                            : "status"
                        }
                      >
                        {employee.status}
                      </span>
                    </td>

                    <td>
                      <div className="employee-actions">
                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            setViewingUser(employee)
                          }
                        >
                          View
                        </button>

                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            openEdit(employee)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            changeStatus(employee)
                          }
                        >
                          {employee.status ===
                          "ACTIVE"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <Link
                          className="small-button"
                          to={`/employees/${employee.id}/attendance`}
                        >
                          Attendance
                        </Link>

                        {currentUser?.role ===
                          "SUPER_ADMIN" &&
                          employee.id !==
                            currentUser.id && (
                            <button
                              type="button"
                              className="small-button danger-button"
                              onClick={() =>
                                deleteEmployee(
                                  employee
                                )
                              }
                            >
                              Delete
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* VIEW EMPLOYEE */}

      {viewingUser && (
        <div className="modal-backdrop">
          <section className="card employee-modal">
            <div className="form-header">
              <div>
                <p className="eyebrow">
                  EMPLOYEE PROFILE
                </p>

                <h2>
                  {viewingUser.name}
                </h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setViewingUser(null)
                }
              >
                Close
              </button>
            </div>

            <div className="profile-grid">
              <div>
                <span>Name</span>
                <strong>
                  {viewingUser.name}
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>
                  {viewingUser.email}
                </strong>
              </div>

              <div>
                <span>Employee Code</span>
                <strong>
                  {viewingUser.employeeCode}
                </strong>
              </div>

              <div>
                <span>Role</span>
                <strong>
                  {viewingUser.role?.replaceAll(
                    "_",
                    " "
                  )}
                </strong>
              </div>

              <div>
                <span>Department</span>
                <strong>
                  {viewingUser.department?.name ||
                    "Not assigned"}
                </strong>
              </div>

              <div>
                <span>Shift</span>
                <strong>
                  {viewingUser.shift?.name ||
                    "Not assigned"}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {viewingUser.status}
                </strong>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  openEdit(viewingUser);
                  setViewingUser(null);
                }}
              >
                Edit Employee
              </button>

              <Link
                className="secondary-button"
                to={`/employees/${viewingUser.id}/attendance`}
                onClick={() =>
                  setViewingUser(null)
                }
              >
                View Attendance
              </Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}