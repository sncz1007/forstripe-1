import { users, paymentRequests, type User, type InsertUser, type PaymentRequest as DBPaymentRequest } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Métodos para gestionar solicitudes de pago
  getPaymentRequestsByRut(rut: string): Promise<PaymentRequest[]>;
  getPaymentRequest(id: string): Promise<PaymentRequest | undefined>;
  getAllPaymentRequests(): Promise<PaymentRequest[]>;
  createPaymentRequest(request: PaymentRequest): Promise<PaymentRequest>;
  updatePaymentRequest(id: string, request: Partial<PaymentRequest>): Promise<PaymentRequest | undefined>;
  deletePaymentRequest(id: string): Promise<boolean>;
  deleteAllPaymentRequests(): Promise<boolean>;
}

// Interfaces adaptadas para la aplicación
export interface PaymentRequest {
  id: string;
  rut: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  timestamp: string; // Timestamp como string para evitar problemas de rango
  response?: string;
  clientName?: string;
  contractNumber?: string;
  vehicleType?: string;
  licensePlate?: string;
  paymentMethod?: string;
  amount?: string;
  paymentLink?: string;
  quotaNumber?: string;
  interestAmount?: string;
  totalAmount?: string;
  dueDate?: string;
  provider?: string;
  quotas?: any;
  redirectUrl?: string;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Implementación de métodos para gestionar solicitudes de pago con base de datos
  async getPaymentRequestsByRut(rut: string): Promise<PaymentRequest[]> {
    try {
      const requests = await db.select().from(paymentRequests).where(eq(paymentRequests.rut, rut));
      return requests.map(this.mapDBToPaymentRequest);
    } catch (error) {
      console.error("Error fetching payment requests by RUT:", error);
      return [];
    }
  }

  async getPaymentRequest(id: string): Promise<PaymentRequest | undefined> {
    try {
      const [request] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id));
      return request ? this.mapDBToPaymentRequest(request) : undefined;
    } catch (error) {
      console.error("Error fetching payment request:", error);
      return undefined;
    }
  }

  async getAllPaymentRequests(): Promise<PaymentRequest[]> {
    try {
      const requests = await db.select().from(paymentRequests);
      return requests.map(this.mapDBToPaymentRequest);
    } catch (error) {
      console.error("Error fetching all payment requests:", error);
      return [];
    }
  }

  async createPaymentRequest(request: PaymentRequest): Promise<PaymentRequest> {
    try {
      const [newRequest] = await db.insert(paymentRequests).values({
        id: request.id,
        rut: request.rut,
        status: request.status,
        timestamp: request.timestamp,
        response: request.response,
        clientName: request.clientName,
        contractNumber: request.contractNumber,
        vehicleType: request.vehicleType,
        licensePlate: request.licensePlate,
        paymentMethod: request.paymentMethod,
        amount: request.amount,
        paymentLink: request.paymentLink,
        quotaNumber: request.quotaNumber,
        interestAmount: request.interestAmount,
        totalAmount: request.totalAmount,
        dueDate: request.dueDate,
        provider: request.provider,
        quotas: request.quotas,
        redirectUrl: request.redirectUrl
      }).returning();
      
      return this.mapDBToPaymentRequest(newRequest);
    } catch (error) {
      console.error("Error creating payment request:", error);
      throw error;
    }
  }

  async updatePaymentRequest(id: string, updates: Partial<PaymentRequest>): Promise<PaymentRequest | undefined> {
    try {
      // Eliminar propiedades no modificables
      const { id: _, ...updateData } = updates;
      
      const [updatedRequest] = await db
        .update(paymentRequests)
        .set(updateData)
        .where(eq(paymentRequests.id, id))
        .returning();
      
      return updatedRequest ? this.mapDBToPaymentRequest(updatedRequest) : undefined;
    } catch (error) {
      console.error("Error updating payment request:", error);
      return undefined;
    }
  }

  async deletePaymentRequest(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(paymentRequests)
        .where(eq(paymentRequests.id, id))
        .returning({ id: paymentRequests.id });
      
      // Si encontramos y eliminamos al menos una fila
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting payment request:", error);
      return false;
    }
  }

  async deleteAllPaymentRequests(): Promise<boolean> {
    try {
      // Eliminar todos los registros de la tabla
      await db
        .delete(paymentRequests)
        .returning({ id: paymentRequests.id });
      
      console.log("Todas las solicitudes de pago han sido eliminadas de la base de datos");
      return true;
    } catch (error) {
      console.error("Error deleting all payment requests:", error);
      return false;
    }
  }

  // Función auxiliar para mapear entre DB y nuestro modelo
  private mapDBToPaymentRequest(dbRequest: DBPaymentRequest): PaymentRequest {
    return {
      id: dbRequest.id,
      rut: dbRequest.rut,
      status: dbRequest.status as 'pending' | 'processing' | 'completed' | 'rejected',
      timestamp: dbRequest.timestamp,
      response: dbRequest.response || undefined,
      clientName: dbRequest.clientName || undefined,
      contractNumber: dbRequest.contractNumber || undefined,
      vehicleType: dbRequest.vehicleType || undefined,
      licensePlate: dbRequest.licensePlate || undefined,
      paymentMethod: dbRequest.paymentMethod || undefined,
      amount: dbRequest.amount || undefined,
      paymentLink: dbRequest.paymentLink || undefined,
      quotaNumber: dbRequest.quotaNumber || undefined,
      interestAmount: dbRequest.interestAmount || undefined,
      totalAmount: dbRequest.totalAmount || undefined,
      dueDate: dbRequest.dueDate || undefined,
      provider: dbRequest.provider || undefined,
      quotas: dbRequest.quotas,
      redirectUrl: dbRequest.redirectUrl || undefined
    };
  }
}

// Respaldo de la implementación en memoria para compatibilidad
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private paymentRequests: PaymentRequest[];
  currentId: number;

  constructor() {
    this.users = new Map();
    this.paymentRequests = [];
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPaymentRequestsByRut(rut: string): Promise<PaymentRequest[]> {
    return this.paymentRequests.filter(req => req.rut === rut);
  }

  async getPaymentRequest(id: string): Promise<PaymentRequest | undefined> {
    return this.paymentRequests.find(req => req.id === id);
  }

  async getAllPaymentRequests(): Promise<PaymentRequest[]> {
    return [...this.paymentRequests];
  }

  async createPaymentRequest(request: PaymentRequest): Promise<PaymentRequest> {
    this.paymentRequests.push(request);
    return request;
  }

  async updatePaymentRequest(id: string, updates: Partial<PaymentRequest>): Promise<PaymentRequest | undefined> {
    const index = this.paymentRequests.findIndex(req => req.id === id);
    if (index === -1) return undefined;

    const updatedRequest = { ...this.paymentRequests[index], ...updates };
    this.paymentRequests[index] = updatedRequest;
    return updatedRequest;
  }

  async deletePaymentRequest(id: string): Promise<boolean> {
    const index = this.paymentRequests.findIndex(req => req.id === id);
    if (index === -1) return false;
    
    this.paymentRequests.splice(index, 1);
    return true;
  }

  async deleteAllPaymentRequests(): Promise<boolean> {
    this.paymentRequests = [];
    return true;
  }
}

// Seleccionar qué implementación usar
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();