import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const organisationName = 'OfficeTrack Organisation';

const accounts = [
  {
    name: 'Owner 1',
    email: 'owner1@officetrack.local',
    employeeCode: 'OWN001',
    role: 'SUPER_ADMIN',
    department: 'Management',
    password: 'Owner@123',
  },
  {
    name: 'Owner 2',
    email: 'owner2@officetrack.local',
    employeeCode: 'OWN002',
    role: 'SUPER_ADMIN',
    department: 'Management',
    password: 'Owner@123',
  },
  {
    name: 'HR Manager',
    email: 'hrmanager@officetrack.local',
    employeeCode: 'HRM001',
    role: 'MANAGER',
    department: 'Human Resources',
    password: 'Manager@123',
  },
  {
    name: 'Sales Manager 1',
    email: 'sales1@officetrack.local',
    employeeCode: 'SAL001',
    role: 'MANAGER',
    department: 'Sales',
    password: 'Manager@123',
  },
  {
    name: 'Sales Manager 2',
    email: 'sales2@officetrack.local',
    employeeCode: 'SAL002',
    role: 'MANAGER',
    department: 'Sales',
    password: 'Manager@123',
  },
  {
    name: 'HR Executive',
    email: 'hrexecutive@officetrack.local',
    employeeCode: 'HRE001',
    role: 'EMPLOYEE',
    department: 'Human Resources',
    password: 'Employee@123',
  },
];

async function main() {
  console.log('Starting OfficeTrack production seed...');

  // Organisation
  const organisation =
    (await prisma.organisation.findFirst({
      where: { name: organisationName },
    })) ||
    (await prisma.organisation.create({
      data: {
        name: organisationName,
      },
    }));

  // Departments
  const departmentNames = [
    'Management',
    'Human Resources',
    'Sales',
  ];

  const departments = {};

  for (const name of departmentNames) {
    departments[name] = await prisma.department.upsert({
      where: {
        organisationId_name: {
          organisationId: organisation.id,
          name,
        },
      },
      update: {},
      create: {
        name,
        organisationId: organisation.id,
      },
    });
  }

  // General Shift
  let shift = await prisma.shift.findFirst({
    where: {
      organisationId: organisation.id,
      name: 'General Shift',
    },
  });

  if (!shift) {
    shift = await prisma.shift.create({
      data: {
        name: 'General Shift',
        organisationId: organisation.id,
      },
    });
  }

  // Create / update test accounts
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);

    await prisma.user.upsert({
      where: {
        organisationId_email: {
          organisationId: organisation.id,
          email: account.email,
        },
      },
      update: {
        name: account.name,
        employeeCode: account.employeeCode,
        passwordHash,
        role: account.role,
        status: 'ACTIVE',
        departmentId: departments[account.department].id,
        shiftId: shift.id,
      },
      create: {
        name: account.name,
        email: account.email,
        employeeCode: account.employeeCode,
        passwordHash,
        role: account.role,
        status: 'ACTIVE',
        organisationId: organisation.id,
        departmentId: departments[account.department].id,
        shiftId: shift.id,
      },
    });

    console.log(`Created/updated: ${account.email}`);
  }

  console.log('');
  console.log('======================================');
  console.log('OfficeTrack seed completed successfully');
  console.log('======================================');
  console.log('');
  console.log('Test accounts:');
  console.log('Owner 1       → owner1@officetrack.local');
  console.log('Owner 2       → owner2@officetrack.local');
  console.log('HR Manager    → hrmanager@officetrack.local');
  console.log('Sales Manager → sales1@officetrack.local');
  console.log('Sales Manager → sales2@officetrack.local');
  console.log('HR Executive  → hrexecutive@officetrack.local');
  console.log('');
  console.log('No sample attendance was created.');
  console.log('======================================');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
