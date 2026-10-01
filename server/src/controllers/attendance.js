import { prisma } from "../config/db.js";
import {
  checkIn,
  checkOut,
} from "../services/attendance.js";
import { z } from "zod";

const ATTENDANCE_ROLES = [
  "EMPLOYEE",
  "MANAGER",
];

const ADMIN_ROLES = [
  "HR_ADMIN",
  "SUPER_ADMIN",
];

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

const manualSchema = z.object({
  employeeId: z.string().uuid(),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),

  status: z
    .enum([
      "PRESENT",
      "LATE",
      "MISSING_CHECKOUT",
    ])
    .default("PRESENT"),
});

function workDateFor(value) {
  const date = value
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date();

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

/*
==================================================
EMPLOYEE CHECK-IN
==================================================
*/

export async function doCheckIn(req, res) {
  if (ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      message:
        "Owner/Admin accounts do not use attendance.",
    });
  }

  const result = await checkIn(req.user);

  return res
    .status(result.status || 201)
    .json(
      result.error
        ? { message: result.error }
        : { attendance: result.data }
    );
}

/*
==================================================
EMPLOYEE CHECK-OUT
==================================================
*/

export async function doCheckOut(req, res) {
  if (ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      message:
        "Owner/Admin accounts do not use attendance.",
    });
  }

  const result = await checkOut(req.user);

  return res
    .status(result.status || 200)
    .json(
      result.error
        ? { message: result.error }
        : { attendance: result.data }
    );
}

/*
==================================================
TODAY'S PERSONAL ATTENDANCE
==================================================

Admins receive null because they do not have
personal attendance.
*/

export async function today(req, res) {
  if (ADMIN_ROLES.includes(req.user.role)) {
    return res.json({
      attendance: null,
    });
  }

  if (!ATTENDANCE_ROLES.includes(req.user.role)) {
    return res.json({
      attendance: null,
    });
  }

  const d = new Date();

  const workDate = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    )
  );

  const attendance =
    await prisma.attendance.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: req.user.id,
          workDate,
        },
      },
    });

  return res.json({
    attendance,
  });
}

/*
==================================================
MY ATTENDANCE HISTORY
==================================================
*/

export async function mine(req, res) {
  if (
    ADMIN_ROLES.includes(req.user.role) ||
    !ATTENDANCE_ROLES.includes(req.user.role)
  ) {
    return res.json({
      attendance: [],
    });
  }

  const attendance =
    await prisma.attendance.findMany({
      where: {
        employeeId: req.user.id,
      },

      orderBy: {
        workDate: "desc",
      },

      take: 100,
    });

  return res.json({
    attendance,
  });
}

/*
==================================================
ADMIN ATTENDANCE REPORT
==================================================

ONLY:
  EMPLOYEE
  MANAGER

NEVER:
  HR_ADMIN
  SUPER_ADMIN
==================================================
*/

export async function report(req, res) {
  const parsed = dateSchema.safeParse(
    req.query.date
  );

  if (!parsed.success) {
    return res.status(400).json({
      message:
        "Date must use YYYY-MM-DD",
    });
  }

  const workDate = workDateFor(
    parsed.data
  );

  const employees =
    await prisma.user.findMany({
      where: {
        organisationId:
          req.user.organisationId,

        status: "ACTIVE",

        role: {
          in: ATTENDANCE_ROLES,
        },
      },

      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        role: true,

        department: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    });

  const employeeIds =
    employees.map(
      (employee) => employee.id
    );

  const attendance =
    employeeIds.length > 0
      ? await prisma.attendance.findMany({
          where: {
            employeeId: {
              in: employeeIds,
            },

            workDate,
          },
        })
      : [];

  const byEmployee =
    new Map(
      attendance.map((record) => [
        record.employeeId,
        record,
      ])
    );

  const rows = employees.map(
    (employee) => ({
      employee,

      attendance:
        byEmployee.get(
          employee.id
        ) || null,

      status:
        byEmployee.get(
          employee.id
        )?.status || "ABSENT",
    })
  );

  const summary = {
    total: rows.length,

    present: rows.filter(
      (row) =>
        row.status === "PRESENT"
    ).length,

    late: rows.filter(
      (row) =>
        row.status === "LATE"
    ).length,

    missingCheckout:
      rows.filter(
        (row) =>
          row.status ===
            "MISSING_CHECKOUT" ||
          (
            row.attendance &&
            !row.attendance.checkOutAt
          )
      ).length,

    absent: rows.filter(
      (row) =>
        row.status === "ABSENT"
    ).length,
  };

  return res.json({
    date: workDate
      .toISOString()
      .slice(0, 10),

    summary,

    rows,
  });
}

/*
==================================================
ADMIN MANUAL ATTENDANCE
==================================================

Only EMPLOYEE / MANAGER can receive
manual attendance.
==================================================
*/

export async function markManual(
  req,
  res
) {
  const parsed =
    manualSchema.safeParse(
      req.body
    );

  if (!parsed.success) {
    return res.status(400).json({
      message:
        "Choose an employee, valid date, and attendance status",
    });
  }

  const data = parsed.data;

  const employee =
    await prisma.user.findFirst({
      where: {
        id: data.employeeId,

        organisationId:
          req.user.organisationId,

        status: "ACTIVE",

        role: {
          in: ATTENDANCE_ROLES,
        },
      },
    });

  if (!employee) {
    return res.status(404).json({
      message:
        "Attendance staff member not found.",
    });
  }

  const workDate =
    workDateFor(data.date);

  const checkInAt =
    new Date(
      `${data.date}T03:30:00.000Z`
    );

  const checkOutAt =
    data.status ===
    "MISSING_CHECKOUT"
      ? null
      : new Date(
          `${data.date}T12:30:00.000Z`
        );

  const attendance =
    await prisma.attendance.upsert({
      where: {
        employeeId_workDate: {
          employeeId: employee.id,
          workDate,
        },
      },

      update: {
        checkInAt,
        checkOutAt,
        status: data.status,
        source: "ADMIN",
        workedMinutes:
          checkOutAt
            ? 540
            : null,
        shiftId:
          employee.shiftId || null,
      },

      create: {
        employeeId: employee.id,
        workDate,
        checkInAt,
        checkOutAt,
        status: data.status,
        source: "ADMIN",
        workedMinutes:
          checkOutAt
            ? 540
            : null,
        shiftId:
          employee.shiftId || null,
      },
    });

  return res.json({
    attendance,
  });
}