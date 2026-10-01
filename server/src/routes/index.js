console.log("🔥 OFFICETRACK ROUTES LOADED - ANALYTICS VERSION");
import * as a from "../controllers/attendance.js";
import * as u from "../controllers/users.js";
import * as l from "../controllers/leaves.js";
import * as reports from "../controllers/reports.js";
import { Router } from "express";
import { login, register, me } from "../controllers/auth.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

const r = Router();

r.post("/auth/register", register);
r.post("/auth/login", login);
r.get("/auth/me", requireAuth, me);

r.use(requireAuth);

r.get("/attendance/today", a.today);
r.post("/attendance/check-in", a.doCheckIn);
r.post("/attendance/check-out", a.doCheckOut);
r.get("/attendance/me", a.mine);

r.get(
  "/attendance/report",
  allowRoles("HR_ADMIN", "SUPER_ADMIN"),
  a.report
);
r.get(
  "/attendance/analytics",
  allowRoles("HR_ADMIN", "SUPER_ADMIN"),
  reports.attendanceAnalytics
);

r.post(
  "/attendance/manual",
  allowRoles("HR_ADMIN", "SUPER_ADMIN"),
  a.markManual
);

r.get(
  "/employees/:id/attendance",
  allowRoles("HR_ADMIN", "SUPER_ADMIN"),
  u.attendanceHistory
);

r.get(
  "/employees",
  allowRoles("HR_ADMIN", "SUPER_ADMIN"),
  u.list
);

r.post(
  "/employees",
  allowRoles("HR_ADMIN", "SUPER_ADMIN"),
  u.create
);
// =========================
// LEAVE MANAGEMENT
// =========================

// Employee - apply for leave
r.post(
  "/leaves",
  l.create
);

// Employee - view own leaves
r.get(
  "/leaves/me",
  l.mine
);

// Employee - cancel pending leave
r.patch(
  "/leaves/:id/cancel",
  l.cancel
);

// Manager / HR / Super Admin - view all leaves
r.get(
  "/leaves",
  allowRoles("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  l.list
);

// Manager / HR / Super Admin - view one leave
r.get(
  "/leaves/:id",
  allowRoles("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  l.getOne
);

// Manager / HR / Super Admin - approve
r.patch(
  "/leaves/:id/approve",
  allowRoles("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  l.approve
);

// Manager / HR / Super Admin - reject
r.patch(
  "/leaves/:id/reject",
  allowRoles("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  l.reject
);

export default r;
