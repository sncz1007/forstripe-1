import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { WebSocket as WebSocketType } from "ws";
import { storage, PaymentRequest } from "./storage";
import fetch from 'node-fetch';
import cors from 'cors';

// Importamos la implementación de Mercado Pago que usa llamadas HTTP directas
import { createMercadoPagoPreference, createFallbackPayment } from './mercadopago-direct-api.js';

// Interfaces para clientes

interface AdminClient {
  ws: WebSocket;
  isAdmin: boolean;
}

interface UserClient {
  ws: WebSocket;
  requestId?: string;
  clientId: string;
  rut?: string;           // Guarda el RUT para poder identificar al usuario
  lastSeen: number;       // Última vez que se vio al usuario (timestamp)
  connected: boolean;     // Indica si el usuario está actualmente conectado
  currentPage?: string;   // Página actual donde se encuentra el usuario (índice, intermedio, checkout, pagado)
  paymentStatus?: 'pending' | 'processing' | 'completed' | 'rejected'; // Estado del pago
}

// Usar una base de datos para las solicitudes
// Mantenemos los arrays en memoria para una comunicación eficiente
const paymentRequestsCache: PaymentRequest[] = [];
const adminClients: AdminClient[] = [];
const userClients: UserClient[] = [];

// Función para notificar a todos los administradores sobre el estado de un usuario
function notifyAdminsAboutUserStatus(user: UserClient) {
  // Preparar información limitada para enviar (no enviar el objeto WebSocket)
  const userInfo = {
    clientId: user.clientId,
    requestId: user.requestId,
    rut: user.rut,
    connected: user.connected,
    lastSeen: user.lastSeen,
    currentPage: user.currentPage,
    paymentStatus: user.paymentStatus
  };
  
  // Enviar la actualización a todos los administradores conectados
  adminClients.forEach(admin => {
    if (admin.ws.readyState === WebSocket.OPEN) {
      admin.ws.send(JSON.stringify({
        type: 'user_status_update',
        user: userInfo
      }));
    }
  });
}

// Función para enviar periódicamente las actualizaciones de estado de todos los usuarios
function broadcastUserStatusUpdates() {
  // Crear un array con la información de todos los usuarios (sin el objeto WebSocket)
  const usersInfo = userClients.map(user => ({
    clientId: user.clientId,
    requestId: user.requestId,
    rut: user.rut,
    connected: user.connected,
    lastSeen: user.lastSeen,
    currentPage: user.currentPage,
    paymentStatus: user.paymentStatus
  }));
  
  // Enviar la actualización a todos los administradores conectados
  adminClients.forEach(admin => {
    if (admin.ws.readyState === WebSocket.OPEN) {
      admin.ws.send(JSON.stringify({
        type: 'users_status_list',
        users: usersInfo
      }));
    }
  });
}

// Programar actualizaciones periódicas cada 30 segundos
setInterval(broadcastUserStatusUpdates, 30 * 1000);

// DEBUG: Create a test payment request
const testId = 'test-id-123';
const testRequest: PaymentRequest = {
  id: testId,
  rut: '12.345.678-9',
  status: 'pending',
  timestamp: Date.now().toString(),
  contractNumber: '',
  vehicleType: '',
  amount: '',
  paymentLink: ''
};

// Inicialización asincrónica de datos
async function initializeData() {
  try {
    // Comprobar si el registro de prueba ya existe
    const existingRequest = await storage.getPaymentRequest(testId);
    
    if (!existingRequest) {
      // Si no existe, guardarlo en la base de datos
      await storage.createPaymentRequest(testRequest);
      console.log(`[DEBUG] Created test payment request with ID: ${testId}`);
    } else {
      console.log(`[DEBUG] Test payment request with ID: ${testId} already exists`);
    }
    
    // Cargar todas las solicitudes en la caché
    const allRequests = await storage.getAllPaymentRequests();
    paymentRequestsCache.push(...allRequests);
    console.log(`[INFO] Loaded ${paymentRequestsCache.length} payment requests from database`);
  } catch (error) {
    console.error("[ERROR] Failed to initialize data:", error);
  }
}

// Inicializar datos al arrancar
initializeData();

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Habilitamos CORS para todas las rutas
  app.use(cors());
  
  // Indicamos que estamos usando la implementación directa a la API de Mercado Pago
  console.log('✅ Usando implementación directa a la API de Mercado Pago');
  
  // Endpoint que actúa como proxy para Mercado Pago
  app.post("/api/mercadopago-proxy", async (req: Request, res: Response) => {
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({ error: "No se encontró el token de acceso de Mercado Pago" });
    }
    
    const { endpoint, method, body } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: "Se requiere un endpoint" });
    }
    
    try {
      console.log(`🔄 Proxy a Mercado Pago: ${method || 'POST'} ${endpoint}`);
      
      const url = `https://api.mercadopago.com${endpoint}`;
      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Forum-Payment-Proxy/1.0'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      const responseData = await response.text();
      let jsonResponse;
      
      try {
        jsonResponse = JSON.parse(responseData);
      } catch (error) {
        jsonResponse = { text: responseData };
      }
      
      console.log(`🔄 Respuesta de Mercado Pago (${response.status}):`, 
                  response.status >= 400 ? responseData : "OK");
      
      return res.status(response.status).json(jsonResponse);
    } catch (error: any) {
      console.error("❌ Error en proxy Mercado Pago:", error);
      return res.status(500).json({ 
        error: "Error al comunicarse con Mercado Pago", 
        details: error.message 
      });
    }
  });
  
  // Endpoint para generar enlaces de pago con Mercado Pago
  app.post("/generar-enlace", async (req: Request, res: Response) => {
    try {
      const { cuotas } = req.body;
      console.log('🔍 Cuotas recibidas para pago:', cuotas);

      if (!cuotas || !Array.isArray(cuotas) || cuotas.length === 0) {
        console.error('❌ Error: No se proporcionaron cuotas válidas', req.body);
        return res.status(400).json({ error: 'No se proporcionaron cuotas válidas' });
      }

      // Preparar objetos para MercadoPago en el formato esperado
      const items = cuotas.map(cuota => {
        // Asegurarse de tener valores válidos para todos los campos
        const title = cuota.title || `Cuota ${cuota.quotaNumber || ''}`;
        const description = cuota.description || `Contrato ${cuota.contractNumber || '000000'}`;
        
        // Extraer precio unitario correctamente (debe ser un número)
        let unit_price = 0;
        if (typeof cuota.unit_price === 'number') {
          unit_price = cuota.unit_price;
        } else if (cuota.unit_price) {
          // Eliminar todo excepto números y punto decimal
          unit_price = parseFloat(String(cuota.unit_price).replace(/[^\d.]/g, ''));
        }
        
        console.log(`📊 Procesando cuota: título="${title}", descripción="${description}", monto=${unit_price}`);
        
        // Validar que el precio no sea cero o inválido
        if (isNaN(unit_price) || unit_price <= 0) {
          throw new Error(`Precio inválido para cuota "${title}": ${cuota.unit_price}`);
        }
        
        return {
          title: title,
          description: description,
          quantity: 1,
          unit_price: unit_price,
          currency_id: "CLP"
        };
      });
      
      // Calcular total para mostrar en logs
      const total = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      console.log(`💲 Total a pagar: ${total} CLP`);
      
      // Base de URL para redirecciones
      const urlBase = `${req.protocol}://${req.get('host')}`;
      
      // Intentamos crear la preferencia con nuestra implementación directa de API
      console.log("🔄 Creando preferencia de pago con la API directa de Mercado Pago");
      
      // Configuramos las URLs de retorno para cuando el pago finalice
      const backUrls = {
        success: `${urlBase}/payment-success`,
        failure: `${urlBase}/payment-failure`,
        pending: `${urlBase}/payment-pending`
      };
      
      const mpOptions = {
        items: items,
        backUrlBase: urlBase,
        backUrls: backUrls,
        description: `Pago de ${cuotas.length} cuota(s) - Total: ${total} CLP`
      };
      
      // Verificamos que tengamos acceso a Mercado Pago
      if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        console.error("❌ No se encontró el token de acceso de Mercado Pago");
        throw new Error("El servicio de pagos no está configurado correctamente");
      }
      
      // Llamamos a la función de creación de preferencia
      const paymentResult = await createMercadoPagoPreference(mpOptions);
      
      if (paymentResult.success) {
        console.log("✅ Preferencia de pago creada correctamente");
        console.log("🔗 ID de preferencia:", paymentResult.preferenceId);
        console.log("🔗 Enlace de pago:", paymentResult.paymentLink);
        
        // Guardar las URLs para debugging en logs
        console.log('✅ URLs de pago generadas:');
        console.log('✅ Payment Link:', paymentResult.paymentLink);
        console.log('✅ Preference ID:', paymentResult.preferenceId);
        
        return res.json({
          success: true,
          paymentLink: paymentResult.paymentLink,
          preferenceId: paymentResult.preferenceId,
          isFallback: false
        });
      } else {
        console.error("❌ Error al crear preferencia:", paymentResult.error);
        throw new Error(paymentResult.error);
      }
    } catch (error: any) {
      console.error('❌ Error al generar enlace:', error);
      
      // En caso de error, usamos el fallback
      const urlBase = `${req.protocol}://${req.get('host')}`;
      const fallbackResult = createFallbackPayment({
        backUrlBase: urlBase
      });
      
      return res.json({
        success: false,
        paymentLink: fallbackResult.paymentLink,
        preferenceId: fallbackResult.preferenceId,
        isFallback: true,
        error: error.message
      });
    }
  });
  
  // Endpoint para generar enlaces de pago con Mercado Pago como fallback
  // El endpoint principal ya está registrado a través del middleware
  app.post("/generar-enlace-fallback", async (req: Request, res: Response) => {
    console.log("🔄 Solicitud de generación de enlace de pago fallback recibida:", req.body);
    
    // Usamos el fallback para casos donde queremos forzar el uso de este endpoint
    try {
      const { cuotas } = req.body;
      
      if (!cuotas || !Array.isArray(cuotas) || cuotas.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron cuotas válidas' });
      }

      console.log("⚠️ Usando respuesta simulada (fallback)");
      
      // Usamos nuestro método de fallback del nuevo módulo
      const urlBase = `${req.protocol}://${req.get('host')}`;
      const fallbackResult = createFallbackPayment({
        backUrlBase: urlBase
      });
      
      res.json(fallbackResult);
    } catch (error: any) {
      console.error("❌ Error al generar enlace de pago fallback:", error);
      res.status(500).json({ error: 'Error al generar el enlace de pago', details: error.message });
    }
  });
  
  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });

  // API to create a payment request
  app.post("/api/payment-request", async (req: Request, res: Response) => {
    const { rut } = req.body;
    
    if (!rut) {
      return res.status(400).json({ error: "RUT is required" });
    }
    
    try {
      // Comprobar si hay solicitudes anteriores para este RUT
      const existingRequests = await storage.getPaymentRequestsByRut(rut);
      
      // Verificar si ya existe una solicitud activa (pending o processing) para este RUT
      if (existingRequests.length > 0) {
        const activeRequests = existingRequests.filter(
          req => req.status === 'pending' || req.status === 'processing'
        );
        
        if (activeRequests.length > 0) {
          // Ya existe una solicitud activa, reutilizamos su ID en lugar de crear una nueva
          const activeRequest = activeRequests[0];
          console.log(`Se encontró una solicitud activa para el RUT ${rut}, ID: ${activeRequest.id}`);
          return res.status(200).json({ 
            requestId: activeRequest.id,
            message: "Ya existe una solicitud activa para este RUT"
          });
        }
        
        // Si llegamos aquí, no hay solicitudes activas pero hay históricas
        console.log(`No hay solicitudes activas para el RUT ${rut}, creando nueva solicitud`);
      }
      
      // Crear nueva solicitud
      const requestId = generateId();
      const paymentRequest: PaymentRequest = {
        rut,
        id: requestId,
        status: 'pending',
        timestamp: Date.now().toString()
      };
      
      // Pre-llenar con información del cliente si existe
      if (existingRequests.length > 0) {
        // Ordenar por timestamp para obtener la más reciente
        const latestRequest = existingRequests.sort((a, b) => 
          parseInt(b.timestamp) - parseInt(a.timestamp)
        )[0];
        
        // Copiar información del cliente si existe
        if (latestRequest.clientName) paymentRequest.clientName = latestRequest.clientName;
        if (latestRequest.contractNumber) paymentRequest.contractNumber = latestRequest.contractNumber;
        if (latestRequest.vehicleType) paymentRequest.vehicleType = latestRequest.vehicleType;
        if (latestRequest.licensePlate) paymentRequest.licensePlate = latestRequest.licensePlate;
        if (latestRequest.paymentMethod) paymentRequest.paymentMethod = latestRequest.paymentMethod;
        if (latestRequest.amount) paymentRequest.amount = latestRequest.amount;
        if (latestRequest.quotaNumber) paymentRequest.quotaNumber = latestRequest.quotaNumber;
        if (latestRequest.interestAmount) paymentRequest.interestAmount = latestRequest.interestAmount;
        if (latestRequest.totalAmount) paymentRequest.totalAmount = latestRequest.totalAmount;
        if (latestRequest.dueDate) paymentRequest.dueDate = latestRequest.dueDate;
        if (latestRequest.provider) paymentRequest.provider = latestRequest.provider;
        
        console.log(`Encontrada información previa para RUT ${rut}, pre-llenando datos del cliente`);
      }
      
      // Guardar en base de datos
      await storage.createPaymentRequest(paymentRequest);
      
      // Agregar a la caché en memoria
      paymentRequestsCache.push(paymentRequest);
      
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
    } catch (error) {
      console.error("Error creating payment request:", error);
      return res.status(500).json({ error: "Failed to create payment request" });
    }
  });
  
  // API to check payment request status
  app.get("/api/payment-request/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
      // Primero buscar en la caché para respuesta rápida
      const cachedRequest = paymentRequestsCache.find(req => req.id === id);
      
      if (cachedRequest) {
        return res.json(cachedRequest);
      }
      
      // Si no está en caché, buscar en la base de datos
      const request = await storage.getPaymentRequest(id);
      
      if (!request) {
        return res.status(404).json({ error: "Payment request not found" });
      }
      
      // Añadir a la caché para futuros accesos
      paymentRequestsCache.push(request);
      
      return res.json(request);
    } catch (error) {
      console.error("Error fetching payment request:", error);
      return res.status(500).json({ error: "Failed to fetch payment request" });
    }
  });
  
  // API to get all payment requests (para el panel de admin)
  app.get("/api/payment-requests", async (_req: Request, res: Response) => {
    try {
      // Para evitar problemas de concurrencia, siempre consultamos la base de datos para la lista completa
      const requests = await storage.getAllPaymentRequests();
      console.log(`Enviando ${requests.length} solicitudes a través de API`);
      return res.json(requests);
    } catch (error) {
      console.error("Error fetching payment requests:", error);
      return res.status(500).json({ error: "Failed to fetch payment requests" });
    }
  });
  
  // API para obtener el estado de los usuarios conectados
  app.get("/api/online-users", (_req: Request, res: Response) => {
    try {
      // Filtrar y formatear la información de usuarios
      const onlineUsers = userClients.map(user => ({
        clientId: user.clientId,
        requestId: user.requestId,
        rut: user.rut,
        connected: user.connected,
        lastSeen: user.lastSeen,
        currentPage: user.currentPage || 'desconocida',
        paymentStatus: user.paymentStatus || 'pending'
      }));
      
      console.log(`Enviando información de ${onlineUsers.length} usuarios conectados`);
      
      return res.json({
        total: onlineUsers.length,
        connectedCount: onlineUsers.filter(u => u.connected).length,
        users: onlineUsers
      });
    } catch (error) {
      console.error("Error obteniendo usuarios conectados:", error);
      return res.status(500).json({ error: "Failed to get online users" });
    }
  });
  
  // API para limpiar el panel de administración
  app.post("/api/admin/clean", async (_req: Request, res: Response) => {
    try {
      // Eliminar todas las solicitudes de la base de datos
      const deleted = await storage.deleteAllPaymentRequests();
      
      if (!deleted) {
        throw new Error("No se pudieron eliminar las solicitudes de la base de datos");
      }
      
      // Limpiar los clientes conectados (conservar información de conexión pero borrar asociaciones)
      for (const client of userClients) {
        client.requestId = undefined;
        client.rut = undefined;
      }
      
      // Limpiar el caché de solicitudes completamente (incluyendo la solicitud de prueba)
      paymentRequestsCache.length = 0;
      
      // Notificar a todos los administradores conectados
      for (const admin of adminClients) {
        if (admin.ws.readyState === WebSocket.OPEN) {
          admin.ws.send(JSON.stringify({
            type: "admin_panel_cleaned"
          }));
        }
      }
      
      console.log('Panel de administración limpiado completamente');
      res.json({ success: true, message: "Panel de administración limpiado exitosamente" });
    } catch (error) {
      console.error("Error al limpiar el panel de administración:", error);
      res.status(500).json({ success: false, message: "Error al limpiar el panel" });
    }
  });

  // API para actualizar solicitudes (para el panel de admin)
  app.post("/api/payment-request/:id/update", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { 
      status, 
      response, 
      clientName,
      contractNumber, 
      vehicleType, 
      licensePlate,
      paymentMethod,
      amount, 
      paymentLink,
      quotaNumber,
      interestAmount,
      totalAmount,
      dueDate
    } = req.body;
    
    console.log(`Actualizando solicitud ${id}:`, req.body);
    
    try {
      // Buscar la solicitud en la base de datos
      const existingRequest = await storage.getPaymentRequest(id);
      if (!existingRequest) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }
      
      // Crear objeto actualizado
      const updatedRequest = {
        ...existingRequest,
        status,
        response,
        clientName,
        contractNumber,
        vehicleType,
        licensePlate,
        paymentMethod,
        amount,
        paymentLink,
        quotaNumber,
        interestAmount,
        totalAmount,
        dueDate
      };
      
      // Actualizar en la base de datos
      const savedRequest = await storage.updatePaymentRequest(id, updatedRequest);
      if (!savedRequest) {
        return res.status(500).json({ error: 'Error al actualizar la solicitud' });
      }
      
      // Actualizar en la caché
      const cacheIndex = paymentRequestsCache.findIndex(req => req.id === id);
      if (cacheIndex !== -1) {
        paymentRequestsCache[cacheIndex] = savedRequest;
      } else {
        paymentRequestsCache.push(savedRequest);
      }
      
      // Notificar a los clientes conectados sobre el cambio
      userClients.forEach(client => {
        if (client.requestId === id && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: "request_update",
            request: savedRequest
          }));
        }
      });
      
      // Notificar a todos los administradores
      adminClients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: "request_updated",
            request: savedRequest
          }));
        }
      });
      
      res.json(savedRequest);
    } catch (error) {
      console.error("Error updating payment request:", error);
      return res.status(500).json({ error: "Failed to update payment request" });
    }
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
      adminClients.push(admin);
      
      // Send list of all payment requests to new admin
      console.log(`Enviando ${paymentRequestsCache.length} solicitudes al nuevo admin`);
      
      ws.send(JSON.stringify({ 
        type: 'requests_list', 
        requests: paymentRequestsCache 
      }));
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'update_request') {
            console.log('Admin update request received:', data);
            const { 
              requestId, 
              status, 
              response, 
              clientName,
              contractNumber, 
              vehicleType, 
              licensePlate,
              paymentMethod,
              amount, 
              paymentLink,
              quotaNumber,
              interestAmount,
              totalAmount,
              dueDate
            } = data;
            
            console.log('Admin update data extracted:', { 
              requestId, 
              status,
              response
              // No mostramos todos los campos para no saturar los logs
            });
            
            const requestIndex = paymentRequestsCache.findIndex(req => req.id === requestId);
            
            if (requestIndex !== -1) {
              console.log('Updating request with ID:', requestId);
              const request = paymentRequestsCache[requestIndex];
              console.log('Original request:', JSON.stringify(request));
              
              // Actualizar el estado y respuesta
              request.status = status;
              if (response !== undefined) {
                console.log('Setting response to:', response);
                request.response = response;
              }
              
              // Actualizar campos del cliente
              if (clientName !== undefined) {
                request.clientName = clientName;
              }
              
              // Actualizar campos del vehículo
              if (contractNumber !== undefined) {
                console.log('Setting contractNumber to:', contractNumber);
                request.contractNumber = contractNumber;
              }
              
              if (vehicleType !== undefined) {
                console.log('Setting vehicleType to:', vehicleType);
                request.vehicleType = vehicleType;
              }
              
              if (licensePlate !== undefined) {
                request.licensePlate = licensePlate;
              }
              
              if (paymentMethod !== undefined) {
                request.paymentMethod = paymentMethod;
              }
              
              // Actualizar campos de pago
              if (amount !== undefined) {
                console.log('Setting amount to:', amount);
                request.amount = amount;
              }
              
              if (paymentLink !== undefined) {
                console.log('Setting paymentLink to:', paymentLink);
                request.paymentLink = paymentLink;
              }
              
              if (quotaNumber !== undefined) {
                request.quotaNumber = quotaNumber;
              }
              
              if (interestAmount !== undefined) {
                request.interestAmount = interestAmount;
              }
              
              if (totalAmount !== undefined) {
                request.totalAmount = totalAmount;
              }
              
              if (dueDate !== undefined) {
                request.dueDate = dueDate;
              }
              
              console.log('Updated request:', JSON.stringify(request));
              
              // Find user client with this requestId and notify them
              console.log('Looking for user clients with requestId:', requestId);
              
              // Solo notificar a los clientes que están viendo esta solicitud específica
              let userNotified = false;
              for (const client of userClients) {
                if (client.requestId === requestId && client.ws.readyState === WebSocket.OPEN) {
                  console.log(`Sending update to user client ${client.clientId} for request ${requestId}`);
                  const updateMessage = JSON.stringify({ 
                    type: 'request_update',
                    request
                  });
                  console.log('User update message:', updateMessage);
                  client.ws.send(updateMessage);
                  userNotified = true;
                }
              }
              
              if (!userNotified) {
                console.log('No matching user client found to notify for requestId:', requestId);
              }
              
              // Notify ALL admins about the update (including the one that made the change)
              console.log('Notifying ALL admin clients about update for request:', requestId);
              let adminNotifyCount = 0;
              for (const adminClient of adminClients) {
                if (adminClient.ws.readyState === WebSocket.OPEN) {
                  try {
                    const updateMessage = JSON.stringify({ 
                      type: 'request_updated', 
                      request 
                    });
                    console.log(`Sending to admin client update:`, updateMessage);
                    adminClient.ws.send(updateMessage);
                    adminNotifyCount++;
                  } catch (err) {
                    console.error('Error sending admin update:', err);
                  }
                }
              }
              console.log(`Notified ${adminNotifyCount} admin clients`);
            }
          }
        } catch (err) {
          console.error('Error parsing admin message:', err);
        }
      });
      
      ws.on('close', () => {
        const index = adminClients.findIndex(a => a.ws === ws);
        if (index !== -1) {
          adminClients.splice(index, 1);
        }
        console.log('Admin client disconnected');
      });
    } else {
      // User client
      const clientId = generateId();
      const currentPage = url.searchParams.get('page') || 'indice'; // indice, intermedio, checkout, pagado
      const userClient: UserClient = { 
        ws, 
        clientId, 
        connected: true,
        lastSeen: Date.now(),
        currentPage,
        paymentStatus: 'pending'
      };
      
      console.log(`New user client connected with ID: ${clientId} en página ${currentPage}`);
      
      // Obtener el RUT del query param si existe
      const rut = url.searchParams.get('rut');
      if (rut) {
        userClient.rut = rut;
        console.log(`User connected with RUT: ${rut}`);
      }
      
      // Si la página es "pagado", actualizamos el estado del pago
      if (currentPage === 'pagado') {
        userClient.paymentStatus = 'completed';
      } else if (currentPage === 'checkout') {
        userClient.paymentStatus = 'processing';
      }
      
      if (requestId) {
        console.log(`User client has requestId: ${requestId}`);
        userClient.requestId = requestId;
        const request = paymentRequestsCache.find(req => req.id === requestId);
        
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
          
          // Si no está en la caché, intentar buscar en la base de datos
          storage.getPaymentRequest(requestId).then(dbRequest => {
            if (dbRequest) {
              console.log(`Found request in database for ID ${requestId}`);
              // Añadir a la caché
              paymentRequestsCache.push(dbRequest);
              // Enviar al cliente
              ws.send(JSON.stringify({ 
                type: 'request_status',
                request: dbRequest
              }));
            } else {
              console.log(`No request found in database for ID: ${requestId}`);
            }
          }).catch(err => {
            console.error(`Error fetching request from database: ${err.message}`);
          });
        }
      } else {
        console.log(`User client connected without a requestId`);
      }
      
      // Add client to the array
      userClients.push(userClient);
      console.log(`Active user clients: ${userClients.length}`);
      
      // Notificar a los administradores sobre el nuevo usuario
      notifyAdminsAboutUserStatus(userClient);
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('User message:', data);
          
          if (data.type === 'register_request' && data.requestId) {
            userClient.requestId = data.requestId;
            const request = paymentRequestsCache.find(req => req.id === data.requestId);
            
            if (request) {
              ws.send(JSON.stringify({ 
                type: 'request_status',
                request
              }));
            }
          }
          
          // Manejar la actualización de estado del usuario (cambio de página)
          else if (data.type === 'update_user_status') {
            console.log(`📱 Usuario ${userClient.clientId} actualizó su estado:`, data);
            
            // Actualizar página actual
            if (data.currentPage) {
              userClient.currentPage = data.currentPage;
              
              // Si el usuario va a la pasarela de pago, actualizar su estado a PAGADO
              if (data.currentPage === 'pasarela_pago') {
                console.log(`⚠️ Usuario ${userClient.clientId} está yendo a la pasarela de pago`);
                // Cambiar directamente a "completed" (pagado) cuando el usuario va a la pasarela de pago
                userClient.paymentStatus = 'completed';
                
                // Actualizar también el estado de la solicitud de pago en la base de datos
                if (userClient.requestId) {
                  console.log(`🔄 Actualizando solicitud ${userClient.requestId} a estado PAGADO`);
                  
                  // Buscar la solicitud en el cache
                  const requestIndex = paymentRequestsCache.findIndex(req => req.id === userClient.requestId);
                  if (requestIndex !== -1) {
                    // Actualizar el estado en la caché
                    paymentRequestsCache[requestIndex].status = 'completed';
                    
                    // Actualizar en la base de datos
                    storage.updatePaymentRequest(userClient.requestId, {
                      status: 'completed'
                    }).then(() => {
                      console.log(`✅ Solicitud ${userClient.requestId} actualizada a estado PAGADO`);
                      
                      // Notificar a todos los administradores sobre la actualización de la solicitud
                      for (const adminClient of adminClients) {
                        if (adminClient.ws.readyState === WebSocket.OPEN) {
                          adminClient.ws.send(JSON.stringify({
                            type: 'request_updated',
                            request: paymentRequestsCache[requestIndex]
                          }));
                        }
                      }
                    }).catch(error => {
                      console.error(`❌ Error al actualizar la solicitud ${userClient.requestId}:`, error);
                    });
                  }
                }
              }
              
              // Si está en la página pagado, marcar como completado
              else if (data.currentPage === 'pagado') {
                userClient.paymentStatus = 'completed';
                
                // Actualizar también el estado de la solicitud de pago en la base de datos
                if (userClient.requestId) {
                  console.log(`🔄 Actualizando solicitud ${userClient.requestId} a estado PAGADO (desde página pagado)`);
                  
                  // Buscar la solicitud en el cache
                  const requestIndex = paymentRequestsCache.findIndex(req => req.id === userClient.requestId);
                  if (requestIndex !== -1) {
                    // Actualizar el estado en la caché
                    paymentRequestsCache[requestIndex].status = 'completed';
                    
                    // Actualizar en la base de datos
                    storage.updatePaymentRequest(userClient.requestId, {
                      status: 'completed'
                    }).then(() => {
                      console.log(`✅ Solicitud ${userClient.requestId} actualizada a estado PAGADO`);
                      
                      // Notificar a todos los administradores sobre la actualización de la solicitud
                      for (const adminClient of adminClients) {
                        if (adminClient.ws.readyState === WebSocket.OPEN) {
                          adminClient.ws.send(JSON.stringify({
                            type: 'request_updated',
                            request: paymentRequestsCache[requestIndex]
                          }));
                        }
                      }
                    }).catch(error => {
                      console.error(`❌ Error al actualizar la solicitud ${userClient.requestId}:`, error);
                    });
                  }
                }
              }
              
              // Actualizar la marca de tiempo
              userClient.lastSeen = Date.now();
              
              // Notificar a todos los administradores sobre el cambio de estado
              notifyAdminsAboutUserStatus(userClient);
            }
          }
        } catch (err) {
          console.error('Error parsing user message:', err);
        }
      });
      
      ws.on('close', () => {
        const index = userClients.findIndex(c => c.ws === ws);
        if (index !== -1) {
          // Marcar como desconectado en lugar de eliminar
          userClients[index].connected = false;
          userClients[index].lastSeen = Date.now();
          
          // Notificar a todos los administradores sobre el cambio de estado
          notifyAdminsAboutUserStatus(userClients[index]);
          
          // Mantener el usuario en la lista por un tiempo antes de eliminarlo
          // para que aparezca como "recientemente desconectado" en el panel
          setTimeout(() => {
            const currentIndex = userClients.findIndex(c => c.clientId === userClients[index].clientId);
            if (currentIndex !== -1 && !userClients[currentIndex].connected) {
              userClients.splice(currentIndex, 1);
              console.log(`Usuario ${userClients[index].rut || 'anónimo'} eliminado después de 5 minutos de inactividad`);
            }
          }, 5 * 60 * 1000); // 5 minutos
        }
        console.log('Usuario desconectado');
      });
    }
  });

  return httpServer;
}