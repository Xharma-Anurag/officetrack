import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/db.js";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  employeeCode: z.string().min(1),
  password: z.string().min(8),
  role: z
    .enum(["EMPLOYEE", "MANAGER", "HR_ADMIN", "SUPER_ADMIN"])
    .default("EMPLOYEE"),
});

const updateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  employeeCode: z.string().min(1),
  role: z.enum(["EMPLOYEE", "MANAGER", "HR_ADMIN", "SUPER_ADMIN"]),
});

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const historySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  employeeCode: true,
  role: true,
  status: true,
  createdAt: true,
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  shift: {
    select: {
      id: true,
      name: true,
      startMinutes: true,
      endMinutes: true,
    },
  },
};

/* =========================
   GET ALL EMPLOYEES
========================= */

export async function list(req, res) {
  try {
    const users = await prisma.user.findMany({
      where: {
        organisationId: req.user.organisationId,
      },
      select: employeeSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ users });
  } catch (error) {
    console.error("List employees error:", error);

    res.status(500).json({
      message: "Unable to load employees.",
    });
  }
}

/* =========================
   GET ONE EMPLOYEE
========================= */

export async function getOne(req, res) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        organisationId: req.user.organisationId,
      },
      select: employeeSelect,
    });

    if (!user) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get employee error:", error);

    res.status(500).json({
      message: "Unable to load employee.",
    });
  }
}

/* =========================
   CREATE EMPLOYEE
========================= */

export async function create(req, res) {
  const parsed = createSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message:
        "Enter a name, valid email, employee code, and password of at least 8 characters.",
    });
  }

  const { password, ...data } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        organisationId: req.user.organisationId,
      },
      select: employeeSelect,
    });

    res.status(201).json({ user });
  } catch (error) {
    console.error("Create employee error:", error);

    res.status(409).json({
      message: "Email or employee code already exists.",
    });
  }
}

/* =========================
   UPDATE EMPLOYEE
========================= */

export async function update(req, res) {
  const parsed = updateSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message:
        "Enter a valid name, email, employee code, and role.",
    });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        organisationId: req.user.organisationId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    /*
      Prevent HR_ADMIN from modifying SUPER_ADMIN.
      SUPER_ADMIN can manage everyone.
    */
    if (
      existing.role === "SUPER_ADMIN" &&
      req.user.role !== "SUPER_ADMIN"
    ) {
      return res.status(403).json({
        message: "Only a Super Admin can modify a Super Admin.",
      });
    }

    const user = await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        employeeCode: parsed.data.employeeCode,
        role: parsed.data.role,
      },
      select: employeeSelect,
    });

    res.json({ user });
  } catch (error) {
    console.error("Update employee error:", error);

    res.status(409).json({
      message: "Email or employee code already exists.",
    });
  }
}

/* =========================
   ACTIVATE / DEACTIVATE
========================= */

export async function updateStatus(req, res) {
  const parsed = statusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Status must be ACTIVE or INACTIVE.",
    });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        organisationId: req.user.organisationId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    if (
      existing.role === "SUPER_ADMIN" &&
      req.user.role !== "SUPER_ADMIN"
    ) {
      return res.status(403).json({
        message:
          "Only a Super Admin can change a Super Admin's status.",
      });
    }

    /*
      Don't allow a Super Admin to deactivate themselves.
    */
    if (
      existing.id === req.user.id &&
      parsed.data.status === "INACTIVE"
    ) {
      return res.status(400).json({
        message: "You cannot deactivate your own account.",
      });
    }

    const user = await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        status: parsed.data.status,
      },
      select: employeeSelect,
    });

    res.json({
      message:
        parsed.data.status === "ACTIVE"
          ? "Employee activated."
          : "Employee deactivated.",
      user,
    });
  } catch (error) {
    console.error("Update employee status error:", error);

    res.status(500).json({
      message: "Unable to update employee status.",
    });
  }
}

/* =========================
   PERMANENT DELETE
========================= */

export async function remove(req, res) {
  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      message:
        "Only a Super Admin can permanently delete an employee.",
    });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        organisationId: req.user.organisationId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    if (existing.id === req.user.id) {
      return res.status(400).json({
        message: "You cannot delete your own account.",
      });
    }

    /*
      Attendance records reference this employee.
      If attendance exists, permanently deleting the user may
      violate the database relationship.

      Therefore, require the account to be inactive and without
      attendance records before permanent deletion.
    */

    const attendanceCount = await prisma.attendance.count({
      where: {
        employeeId: existing.id,
      },
    });

    if (attendanceCount > 0) {
      return res.status(409).json({
        message:
          "This employee has attendance history. Deactivate the account instead of permanently deleting it.",
      });
    }

    await prisma.user.delete({
      where: {
        id: existing.id,
      },
    });

    res.json({
      message: "Employee permanently deleted.",
    });
  } catch (error) {
    console.error("Delete employee error:", error);

    res.status(500).json({
      message: "Unable to delete employee.",
    });
  }
}

/* =========================
   ATTENDANCE HISTORY
========================= */

export async function attendanceHistory(req, res) {
  const parsed = historySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Dates must use YYYY-MM-DD",
    });
  }

  const now = new Date();

  const monthStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  );

  const from = new Date(
    `${parsed.data.from || monthStart.toISOString().slice(0, 10)}T00:00:00.000Z`
  );

  const to = new Date(
    `${parsed.data.to || now.toISOString().slice(0, 10)}T00:00:00.000Z`
  );

  if (from > to) {
    return res.status(400).json({
      message: "Start date must be before end date",
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: req.params.id,
      organisationId: req.user.organisationId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      employeeCode: true,
      role: true,
      status: true,
      department: {
        select: {
          name: true,
        },
      },
      shift: {
        select: {
          name: true,
          startMinutes: true,
          endMinutes: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      message: "Employee not found",
    });
  }

  const attendance = await prisma.attendance.findMany({
    where: {
      employeeId: user.id,
      workDate: {
        gte: from,
        lte: to,
      },
    },
    orderBy: {
      workDate: "desc",
    },
  });

  const summary = {
    daysRecorded: attendance.length,
    present: attendance.filter(
      (row) => row.status === "PRESENT"
    ).length,
    late: attendance.filter(
      (row) => row.status === "LATE"
    ).length,
    missingCheckout: attendance.filter(
      (row) =>
        row.status === "MISSING_CHECKOUT" ||
        !row.checkOutAt
    ).length,
    totalWorkedMinutes: attendance.reduce(
      (total, row) =>
        total + (row.workedMinutes || 0),
      0
    ),
  };

  res.json({
    employee: user,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    summary,
    attendance,
  });
}