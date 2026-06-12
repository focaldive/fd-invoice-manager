import {
  pgTable,
  uuid,
  text,
  date,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const employeeStatuses = ["active", "inactive"] as const;
export type EmployeeStatus = (typeof employeeStatuses)[number];

export const paymentModes = ["bank_transfer", "cash", "cheque"] as const;
export type PaymentMode = (typeof paymentModes)[number];

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeNumber: text("employee_number").notNull().unique(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    department: text("department").notNull(),
    designation: text("designation").notNull(),
    joinedDate: date("joined_date"),
    status: text("status", { enum: employeeStatuses }).notNull().default("active"),
    paymentMode: text("payment_mode", { enum: paymentModes }).notNull().default("bank_transfer"),
    bankName: text("bank_name"),
    bankAccountName: text("bank_account_name"),
    bankAccountNumber: text("bank_account_number"),
    bankBranch: text("bank_branch"),
    basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("LKR"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("employees_department_idx").on(t.department),
    index("employees_status_idx").on(t.status),
  ],
);
