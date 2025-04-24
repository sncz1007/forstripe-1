import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tabla para almacenar las solicitudes de pago
export const paymentRequests = pgTable("payment_requests", {
  id: text("id").primaryKey(), // ID único de la solicitud
  rut: text("rut").notNull(), // RUT del cliente
  status: text("status").notNull(), // pending, processing, completed, rejected
  timestamp: text("timestamp").notNull(), // Timestamp de creación como texto para evitar problemas de rango
  response: text("response"), // Respuesta al cliente
  clientName: text("client_name"), // Nombre del cliente
  contractNumber: text("contract_number"), // Número de contrato
  vehicleType: text("vehicle_type"), // Tipo de vehículo
  licensePlate: text("license_plate"), // Patente del vehículo
  paymentMethod: text("payment_method"), // Método de pago
  amount: text("amount"), // Monto a pagar
  paymentLink: text("payment_link"), // Enlace de pago
  quotaNumber: text("quota_number"), // Número de cuota
  interestAmount: text("interest_amount"), // Monto de interés
  totalAmount: text("total_amount"), // Monto total
  dueDate: text("due_date"), // Fecha de vencimiento
  provider: text("provider"), // Proveedor de pago
  quotas: json("quotas"), // Información de cuotas como JSON
  redirectUrl: text("redirect_url"), // URL de redirección
});

export const insertPaymentRequestSchema = createInsertSchema(paymentRequests);

export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
