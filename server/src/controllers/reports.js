
import { prisma } from "../config/db.js";

function dateOnly(value) {
  const date = new Date(String(value) + "T00:00:00.000Z");

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date: " + value);
  }

  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDaysBetween(start, end) {
  const days = [];
  const current = new Date(start);

  while (current <= end) {
    days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

function minutesToHours(minutes) {
  if (!minutes || minutes <= 0) {
    return "0h 0m";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return hours + "h " + mins + "m";
}

export async function attendanceAnalytics(req, res) {
  try {
    const organisationId = req.user?.organisationId;

    if (!organisationId) {
      return res.status(400).json({
        success: false,
        message: "User organisation not found",
      });
    }

    const now = new Date();

    const defaultFrom = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1
      )
    );

    const defaultTo = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        0
      )
    );

    const start = req.query.from
      ? dateOnly(req.query.from)
      : defaultFrom;

    const end = req.query.to
      ? dateOnly(req.query.to)
      : defaultTo;

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after to date",
      });
    }

    const days = getDaysBetween(start, end);

    const employees = await prisma.user.findMany({
      where: {
        organisationId,
        status: "ACTIVE",
        role: {
          in: ["EMPLOYEE", "MANAGER"],
        },
      },

      select: {
        id: true,
        employeeCode: true,
        name: true,
        email: true,
        role: true,

        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    });

    const employeeIds = employees.map(
      (employee) => employee.id
    );

    if (employeeIds.length === 0) {
      return res.json({
        success: true,

        range: {
          from: formatDate(start),
          to: formatDate(end),
          totalDays: days.length,
        },

        summary: {
          totalEmployees: 0,
          present: 0,
          late: 0,
          missingCheckout: 0,
          absent: 0,
          attendancePercentage: 0,
          totalWorkedMinutes: 0,
          averageWorkingMinutes: 0,
          averageWorkingTime: "0h 0m",
        },

        dailyTrend: [],
        employees: [],
      });
    }

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: {
          in: employeeIds,
        },

        workDate: {
          gte: start,
          lte: end,
        },
      },

      select: {
        id: true,
        employeeId: true,
        workDate: true,
        checkInAt: true,
        checkOutAt: true,
        status: true,
        workedMinutes: true,
      },

      orderBy: {
        workDate: "asc",
      },
    });

    const attendanceMap = new Map();

    for (const record of attendance) {
      const date = formatDate(record.workDate);

      attendanceMap.set(
        record.employeeId + "_" + date,
        record
      );
    }

    let present = 0;
    let late = 0;
    let missingCheckout = 0;
    let absent = 0;
    let totalWorkedMinutes = 0;

    for (const day of days) {
      const date = formatDate(day);

      for (const employee of employees) {
        const record = attendanceMap.get(
          employee.id + "_" + date
        );

        if (!record) {
          absent++;
          continue;
        }

        if (record.status === "PRESENT") {
          present++;
        }

        if (record.status === "LATE") {
          late++;
        }

        if (record.status === "MISSING_CHECKOUT") {
          missingCheckout++;
        }

        totalWorkedMinutes +=
          Number(record.workedMinutes) || 0;
      }
    }

    const totalEmployees = employees.length;
    const totalDays = days.length;

    const possibleAttendance =
      totalEmployees * totalDays;

    const attended =
      present +
      late +
      missingCheckout;

    const attendancePercentage =
      possibleAttendance > 0
        ? Number(
            (
              (attended / possibleAttendance) *
              100
            ).toFixed(2)
          )
        : 0;

    const averageWorkingMinutes =
      attended > 0
        ? Math.round(
            totalWorkedMinutes / attended
          )
        : 0;

    const dailyTrend = days.map((day) => {
      const date = formatDate(day);

      let dayPresent = 0;
      let dayLate = 0;
      let dayMissingCheckout = 0;
      let dayAbsent = 0;
      let dayWorkedMinutes = 0;

      for (const employee of employees) {
        const record = attendanceMap.get(
          employee.id + "_" + date
        );

        if (!record) {
          dayAbsent++;
          continue;
        }

        if (record.status === "PRESENT") {
          dayPresent++;
        }

        if (record.status === "LATE") {
          dayLate++;
        }

        if (record.status === "MISSING_CHECKOUT") {
          dayMissingCheckout++;
        }

        dayWorkedMinutes +=
          Number(record.workedMinutes) || 0;
      }

      const dayAttended =
        dayPresent +
        dayLate +
        dayMissingCheckout;

      const dayAttendancePercentage =
        totalEmployees > 0
          ? Number(
              (
                (dayAttended / totalEmployees) *
                100
              ).toFixed(2)
            )
          : 0;

      return {
        date,
        present: dayPresent,
        late: dayLate,
        missingCheckout: dayMissingCheckout,
        absent: dayAbsent,
        attendancePercentage:
          dayAttendancePercentage,
        workedMinutes: dayWorkedMinutes,
      };
    });

    const employeeSummary = employees.map(
      (employee) => {
        let employeePresent = 0;
        let employeeLate = 0;
        let employeeMissingCheckout = 0;
        let employeeAbsent = 0;
        let employeeWorkedMinutes = 0;

        for (const day of days) {
          const date = formatDate(day);

          const record = attendanceMap.get(
            employee.id + "_" + date
          );

          if (!record) {
            employeeAbsent++;
            continue;
          }

          if (record.status === "PRESENT") {
            employeePresent++;
          }

          if (record.status === "LATE") {
            employeeLate++;
          }

          if (record.status === "MISSING_CHECKOUT") {
            employeeMissingCheckout++;
          }

          employeeWorkedMinutes +=
            Number(record.workedMinutes) || 0;
        }

        const employeeAttended =
          employeePresent +
          employeeLate +
          employeeMissingCheckout;

        const employeeAttendancePercentage =
          totalDays > 0
            ? Number(
                (
                  (employeeAttended / totalDays) *
                  100
                ).toFixed(2)
              )
            : 0;

        const employeeAverageMinutes =
          employeeAttended > 0
            ? Math.round(
                employeeWorkedMinutes /
                employeeAttended
              )
            : 0;

        return {
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          email: employee.email,
          role: employee.role,

          department: employee.department
            ? {
                id: employee.department.id,
                name: employee.department.name,
              }
            : null,

          present: employeePresent,
          late: employeeLate,
          missingCheckout:
            employeeMissingCheckout,
          absent: employeeAbsent,

          attendancePercentage:
            employeeAttendancePercentage,

          workedMinutes:
            employeeWorkedMinutes,

          averageWorkingMinutes:
            employeeAverageMinutes,

          averageWorkingTime:
            minutesToHours(
              employeeAverageMinutes
            ),
        };
      }
    );

    return res.json({
      success: true,

      range: {
        from: formatDate(start),
        to: formatDate(end),
        totalDays,
      },

      summary: {
        totalEmployees,
        present,
        late,
        missingCheckout,
        absent,
        attendancePercentage,
        totalWorkedMinutes,
        averageWorkingMinutes,
        averageWorkingTime:
          minutesToHours(
            averageWorkingMinutes
          ),
      },

      dailyTrend,

      employees: employeeSummary,
    });
  } catch (error) {
    console.error(
      "===================================="
    );

    console.error(
      "ATTENDANCE ANALYTICS ERROR:"
    );

    console.error(error);

    console.error(
      "===================================="
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to generate attendance analytics",
    });
  }
}

