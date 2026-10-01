import { z } from "zod";
import { prisma } from "../config/db.js";


// =========================
// VALIDATION
// =========================

const createLeaveSchema = z.object({
  type: z.enum(["CASUAL", "SICK", "ANNUAL", "UNPAID"]),

  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),

  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),

  reason: z
    .string()
    .trim()
    .min(3)
    .max(500),
});

const decisionSchema = z.object({
  comment: z
    .string()
    .trim()
    .max(500)
    .optional(),
});


// =========================
// HELPERS
// =========================

function dateOnly(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function calculateDays(startDate, endDate) {
  const start = dateOnly(startDate);
  const end = dateOnly(endDate);

  const difference =
    end.getTime() - start.getTime();

  return (
    Math.floor(
      difference / (1000 * 60 * 60 * 24)
    ) + 1
  );
}


// =========================
// EMPLOYEE
// APPLY FOR LEAVE
// =========================

export async function create(req, res) {
  const parsed = createLeaveSchema.safeParse(
    req.body
  );

  if (!parsed.success) {
    return res.status(400).json({
      message:
        "Enter valid leave type, dates and reason.",
    });
  }

  const {
    type,
    startDate,
    endDate,
    reason,
  } = parsed.data;

  const days = calculateDays(
    startDate,
    endDate
  );

  if (days <= 0) {
    return res.status(400).json({
      message:
        "End date must be after or equal to start date.",
    });
  }

  // Employee must exist and be active
  const employee = await prisma.user.findFirst({
    where: {
      id: req.user.id,
      organisationId: req.user.organisationId,
      status: "ACTIVE",
    },

    select: {
      id: true,
      name: true,
    },
  });

  if (!employee) {
    return res.status(404).json({
      message: "Employee account not found.",
    });
  }

  // Check overlapping pending/approved leave
  const overlappingLeave =
    await prisma.leave.findFirst({
      where: {
        employeeId: req.user.id,

        status: {
          in: ["PENDING", "APPROVED"],
        },

        startDate: {
          lte: dateOnly(endDate),
        },

        endDate: {
          gte: dateOnly(startDate),
        },
      },
    });

  if (overlappingLeave) {
    return res.status(409).json({
      message:
        "You already have a leave request for these dates.",
    });
  }

  const leave = await prisma.leave.create({
    data: {
      employeeId: req.user.id,
      organisationId: req.user.organisationId,

      type,

      startDate: dateOnly(startDate),
      endDate: dateOnly(endDate),

      days,

      reason,

      status: "PENDING",
    },

    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
        },
      },
    },
  });

  return res.status(201).json({
    message:
      "Leave request submitted successfully.",

    leave,
  });
}


// =========================
// EMPLOYEE
// MY LEAVES
// =========================

export async function mine(req, res) {
console.log("PRISMA LEAVE MODEL:", prisma.leave);
  const leaves =
    await prisma.leave.findMany({
      where: {
        employeeId: req.user.id,
        organisationId:
          req.user.organisationId,
      },

      include: {
        approver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },

      orderBy: {
        startDate: "desc",
      },
    });

  const summary = {
    total: leaves.length,

    pending: leaves.filter(
      (leave) =>
        leave.status === "PENDING"
    ).length,

    approved: leaves.filter(
      (leave) =>
        leave.status === "APPROVED"
    ).length,

    rejected: leaves.filter(
      (leave) =>
        leave.status === "REJECTED"
    ).length,

    cancelled: leaves.filter(
      (leave) =>
        leave.status === "CANCELLED"
    ).length,

    approvedDays: leaves
      .filter(
        (leave) =>
          leave.status === "APPROVED"
      )
      .reduce(
        (total, leave) =>
          total + leave.days,
        0
      ),
  };

  return res.json({
    summary,
    leaves,
  });
}


// =========================
// EMPLOYEE
// CANCEL LEAVE
// =========================

export async function cancel(req, res) {
  const leave =
    await prisma.leave.findFirst({
      where: {
        id: req.params.id,

        employeeId: req.user.id,

        organisationId:
          req.user.organisationId,
      },
    });

  if (!leave) {
    return res.status(404).json({
      message:
        "Leave request not found.",
    });
  }

  if (leave.status !== "PENDING") {
    return res.status(400).json({
      message:
        "Only pending leave requests can be cancelled.",
    });
  }

  const updated =
    await prisma.leave.update({
      where: {
        id: leave.id,
      },

      data: {
        status: "CANCELLED",
      },
    });

  return res.json({
    message:
      "Leave request cancelled.",

    leave: updated,
  });
}


// =========================
// ADMIN / MANAGER
// ALL LEAVES
// =========================

export async function list(req, res) {
  const validStatuses = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
  ];

  const validTypes = [
    "CASUAL",
    "SICK",
    "ANNUAL",
    "UNPAID",
  ];

  const status =
    validStatuses.includes(req.query.status)
      ? req.query.status
      : undefined;

  const type =
    validTypes.includes(req.query.type)
      ? req.query.type
      : undefined;

  const leaves =
    await prisma.leave.findMany({
      where: {
        organisationId:
          req.user.organisationId,

        ...(status ? { status } : {}),

        ...(type ? { type } : {}),
      },

      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            role: true,

            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        approver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  const summary = {
    total: leaves.length,

    pending: leaves.filter(
      (leave) =>
        leave.status === "PENDING"
    ).length,

    approved: leaves.filter(
      (leave) =>
        leave.status === "APPROVED"
    ).length,

    rejected: leaves.filter(
      (leave) =>
        leave.status === "REJECTED"
    ).length,

    cancelled: leaves.filter(
      (leave) =>
        leave.status === "CANCELLED"
    ).length,
  };

  return res.json({
    summary,
    leaves,
  });
}


// =========================
// ADMIN / MANAGER
// SINGLE LEAVE
// =========================

export async function getOne(req, res) {
  const leave =
    await prisma.leave.findFirst({
      where: {
        id: req.params.id,

        organisationId:
          req.user.organisationId,
      },

      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            role: true,
            status: true,

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
          },
        },

        approver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

  if (!leave) {
    return res.status(404).json({
      message:
        "Leave request not found.",
    });
  }

  return res.json({
    leave,
  });
}


// =========================
// ADMIN / MANAGER
// APPROVE
// =========================

export async function approve(req, res) {
  const parsed =
    decisionSchema.safeParse(
      req.body || {}
    );

  if (!parsed.success) {
    return res.status(400).json({
      message:
        "Invalid approval comment.",
    });
  }

  const leave =
    await prisma.leave.findFirst({
      where: {
        id: req.params.id,

        organisationId:
          req.user.organisationId,
      },
    });

  if (!leave) {
    return res.status(404).json({
      message:
        "Leave request not found.",
    });
  }

  if (leave.status !== "PENDING") {
    return res.status(400).json({
      message:
        `This leave is already ${leave.status.toLowerCase()}.`,
    });
  }

  // Don't approve leave if attendance
  // already exists for the requested dates.
  const attendance =
    await prisma.attendance.findFirst({
      where: {
        employeeId:
          leave.employeeId,

        workDate: {
          gte: leave.startDate,
          lte: leave.endDate,
        },
      },
    });

  if (attendance) {
    return res.status(409).json({
      message:
        "Attendance already exists for one or more leave dates. Resolve the attendance record before approving this leave.",
    });
  }

  const updated =
    await prisma.leave.update({
      where: {
        id: leave.id,
      },

      data: {
        status: "APPROVED",

        approverId:
          req.user.id,

        approvalComment:
          parsed.data.comment ||
          null,
      },

      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
          },
        },

        approver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

  return res.json({
    message:
      "Leave approved successfully.",

    leave: updated,
  });
}


// =========================
// ADMIN / MANAGER
// REJECT
// =========================

export async function reject(req, res) {
  const parsed =
    decisionSchema.safeParse(
      req.body || {}
    );

  if (!parsed.success) {
    return res.status(400).json({
      message:
        "Invalid rejection comment.",
    });
  }

  const leave =
    await prisma.leave.findFirst({
      where: {
        id: req.params.id,

        organisationId:
          req.user.organisationId,
      },
    });

  if (!leave) {
    return res.status(404).json({
      message:
        "Leave request not found.",
    });
  }

  if (leave.status !== "PENDING") {
    return res.status(400).json({
      message:
        `This leave is already ${leave.status.toLowerCase()}.`,
    });
  }

  const updated =
    await prisma.leave.update({
      where: {
        id: leave.id,
      },

      data: {
        status: "REJECTED",

        approverId:
          req.user.id,

        approvalComment:
          parsed.data.comment ||
          null,
      },

      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
          },
        },

        approver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

  return res.json({
    message:
      "Leave rejected.",

    leave: updated,
  });
}