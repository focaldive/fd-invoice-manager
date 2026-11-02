import { relations } from "drizzle-orm";
import { clients } from "./schema/clients";
import { invoices } from "./schema/invoices";
import { invoiceItems } from "./schema/invoice-items";
import { payments } from "./schema/payments";
import { recurringInvoices } from "./schema/recurring-invoices";
import { recurringInvoiceItems } from "./schema/recurring-invoice-items";
import { employees } from "./schema/employees";
import { payslips } from "./schema/payslips";
import { payslipItems } from "./schema/payslip-items";
import { recurringPayslips } from "./schema/recurring-payslips";
import { recurringPayslipItems } from "./schema/recurring-payslip-items";

export const clientsRelations = relations(clients, ({ many }) => ({
  invoices: many(invoices),
  recurringInvoices: many(recurringInvoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  recurringInvoice: one(recurringInvoices, {
    fields: [invoices.recurringInvoiceId],
    references: [recurringInvoices.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const recurringInvoicesRelations = relations(recurringInvoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [recurringInvoices.clientId],
    references: [clients.id],
  }),
  items: many(recurringInvoiceItems),
  generatedInvoices: many(invoices),
}));

export const recurringInvoiceItemsRelations = relations(recurringInvoiceItems, ({ one }) => ({
  template: one(recurringInvoices, {
    fields: [recurringInvoiceItems.recurringInvoiceId],
    references: [recurringInvoices.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  payslips: many(payslips),
  recurringPayslips: many(recurringPayslips),
}));

export const payslipsRelations = relations(payslips, ({ one, many }) => ({
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  recurringPayslip: one(recurringPayslips, {
    fields: [payslips.recurringPayslipId],
    references: [recurringPayslips.id],
  }),
  items: many(payslipItems),
}));

export const recurringPayslipsRelations = relations(recurringPayslips, ({ one, many }) => ({
  employee: one(employees, {
    fields: [recurringPayslips.employeeId],
    references: [employees.id],
  }),
  items: many(recurringPayslipItems),
  generatedPayslips: many(payslips),
}));

export const recurringPayslipItemsRelations = relations(recurringPayslipItems, ({ one }) => ({
  template: one(recurringPayslips, {
    fields: [recurringPayslipItems.recurringPayslipId],
    references: [recurringPayslips.id],
  }),
}));

export const payslipItemsRelations = relations(payslipItems, ({ one }) => ({
  payslip: one(payslips, {
    fields: [payslipItems.payslipId],
    references: [payslips.id],
  }),
}));
