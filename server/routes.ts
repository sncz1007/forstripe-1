import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { WebSocket as WebSocketType } from "ws";
import { storage, PaymentRequest } from "./storage";
import fetch from 'node-fetch';
import cors from 'cors';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('Received SIGINT signal');
  process.exit(0);
});

// Efipay API configuration
// Base URL: https://sag.efipay.co (alternativa: https://api.efipay.co)
const EFIPAY_BASE_URL = 'https://sag.efipay.co';
const EFIPAY_TOKEN = process.env.EFIPAY_TEST_KEY || process.env.EFIPAY_API_TOKEN || '';
// REQUERIDO por Efipay: agrega EFIPAY_OFFICE_ID en Secrets (solicitar a soporte@efipay.co)
const EFIPAY_OFFICE_ID = process.env.EFIPAY_OFFICE_ID ? Number(process.env.EFIPAY_OFFICE_ID) : null;
// REQUERIDO por Efipay: moneda habilitada en la cuenta ("COP" o "USD" por defecto; CLP necesita activación)
const EFIPAY_CURRENCY = process.env.EFIPAY_CURRENCY || 'CLP';

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

// Función genérica para enviar mensajes a todos los administradores
function broadcastToAdmins(payload: any) {
  adminClients.forEach(admin => {
    if (admin.ws.readyState === WebSocket.OPEN) {
      admin.ws.send(JSON.stringify(payload));
    }
  });
}

// Broadcast message to user clients with a specific requestId
function broadcastToUser(requestId: string, payload: any) {
  userClients.forEach(client => {
    if (client.requestId === requestId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(payload));
    }
  });
}

// Webhook setup for backward compatibility with server/index.ts
export function setupStripeWebhook(_app: any) {
  console.log('ℹ️ Efipay webhook configurado en /api/efipay-webhook');
}

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
  
  // Validar credenciales de Efipay
  if (!EFIPAY_TOKEN) {
    console.warn('⚠️ EFIPAY_TEST_KEY no configurada - pagos no funcionarán');
  } else {
    console.log('✅ Efipay configurado correctamente (modo pruebas CLP)');
  }
  
  
  // Helper function to safely parse CLP amounts
  function sanitizeCLPAmount(amountStr: string): number {
    if (!amountStr) return 0;
    // Remove everything except digits 
    const cleanAmount = amountStr.replace(/[^\d]/g, '');
    if (!cleanAmount) return 0;
    const amount = parseInt(cleanAmount, 10);
    return isNaN(amount) ? 0 : amount;
  }

  // Endpoint para crear checkout de Efipay (modo pruebas, CLP)
  app.post("/generar-enlace", async (req: Request, res: Response) => {
    try {
      const { requestId, selectedQuotaIndices } = req.body;
      console.log('🔍 Solicitud de pago para requestId:', requestId, 'cuotas:', selectedQuotaIndices);

      if (!requestId) {
        return res.status(400).json({ error: 'Se requiere requestId para procesar el pago' });
      }

      if (!selectedQuotaIndices || !Array.isArray(selectedQuotaIndices) || selectedQuotaIndices.length === 0) {
        return res.status(400).json({ error: 'Se requieren índices de cuotas seleccionadas' });
      }

      // Crear clave de idempotencia para evitar duplicados
      const idempotencyKey = `${requestId}-${selectedQuotaIndices.sort().join('-')}`;
      console.log('🔑 Clave de idempotencia:', idempotencyKey);

      // Obtener la solicitud de pago del storage para validar 
      const paymentRequest = await storage.getPaymentRequest(requestId);
      if (!paymentRequest) {
        return res.status(404).json({ error: 'Solicitud de pago no encontrada' });
      }

      if (!paymentRequest.response) {
        return res.status(400).json({ error: 'La solicitud no tiene datos de cuotas disponibles' });
      }

      // Parsear las cuotas desde el campo response (similar a como lo hace el frontend)
      const responseText = paymentRequest.response;
      const lines = responseText.split(/\r?\n/).map((line: string) => line.trim()).filter((line: string) => line !== "");
      
      if (lines.length < 2) {
        return res.status(400).json({ error: 'Datos de cuotas insuficientes en la solicitud' });
      }

      // Encontrar cuotas en el texto (similar lógica al frontend)
      const quotaStartIndices: number[] = [];
      lines.forEach((line: string, index: number) => {
        if (line.match(/^Cuota\s+N[°o]?\s*\d+$/)) {
          quotaStartIndices.push(index);
        }
      });

      if (quotaStartIndices.length === 0) {
        return res.status(400).json({ error: 'No se encontraron cuotas válidas en la solicitud' });
      }

      // Procesar cuotas y calcular total server-side
      const quotas: any[] = [];
      let totalAmount = 0;
      const itemDescriptions = [];

      quotaStartIndices.forEach((startIndex: number, idx: number) => {
        const endIndex = idx < quotaStartIndices.length - 1 ? quotaStartIndices[idx + 1] : lines.length;
        const quotaLines = lines.slice(startIndex, endIndex);
        
        // Extraer información de la cuota
        let quotaNumber = "";
        let totalAmountStr = "$0";
        
        // Extraer número de cuota
        const quotaMatch = lines[startIndex].match(/Cuota\s+N[°o]?\s*(\d+)/);
        if (quotaMatch) {
          quotaNumber = quotaMatch[1];
        }
        
        // Buscar el total en las líneas de esta cuota
        // Buscar primero "Total Cuota" y luego encontrar el monto correspondiente
        let totalCuotaIndex = -1;
        for (let i = 0; i < quotaLines.length; i++) {
          if (quotaLines[i] === "Total Cuota") {
            totalCuotaIndex = i;
            break;
          }
        }
        
        // Si encontramos "Total Cuota", buscar el monto después del vencimiento
        if (totalCuotaIndex !== -1) {
          // Buscar el primer monto que empiece con $ después de la línea "Total Cuota"
          for (let i = totalCuotaIndex + 1; i < quotaLines.length; i++) {
            const line = quotaLines[i].trim();
            if (line.startsWith('$') && line.length > 1) {
              // Tomar el último monto que encuentra (que debería ser el total)
              totalAmountStr = line;
            }
          }
        }
        
        quotas.push({
          quotaNumber,
          totalAmount: totalAmountStr
        });
      });

      // Validar que los índices seleccionados son válidos
      for (const idx of selectedQuotaIndices) {
        if (idx < 0 || idx >= quotas.length) {
          return res.status(400).json({ error: `Índice de cuota inválido: ${idx}` });
        }
      }

      // Calcular total de cuotas seleccionadas
      for (const idx of selectedQuotaIndices) {
        const quota = quotas[idx];
        const amount = sanitizeCLPAmount(quota.totalAmount);
        if (amount <= 0) {
          return res.status(400).json({ error: `Monto inválido para cuota ${quota.quotaNumber}: ${quota.totalAmount}` });
        }
        totalAmount += amount;
        itemDescriptions.push(`Cuota N°${quota.quotaNumber} - $${amount.toLocaleString('es-CL')} CLP`);
      }
      
      if (totalAmount <= 0) {
        return res.status(400).json({ error: 'El monto total debe ser mayor a 0' });
      }

      console.log(`💲 Total calculado server-side: $${totalAmount.toLocaleString('es-CL')} CLP`);
      
      // Crear pago en Efipay (modo pruebas, CLP)
      if (!EFIPAY_TOKEN) {
        return res.status(500).json({ error: 'Efipay no está configurado correctamente (falta EFIPAY_TEST_KEY en Secrets)' });
      }

      // Obtener email del pagador desde la solicitud
      const payerEmail = paymentRequest.email || 'pagador@ejemplo.com';
      const payerName = paymentRequest.rut || 'Cliente';

      const efipayHeaders = {
        'Authorization': `Bearer ${EFIPAY_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Advertir si falta office ID
      if (!EFIPAY_OFFICE_ID) {
        console.warn('⚠️ EFIPAY_OFFICE_ID no configurado. Solicitar ID de sucursal a soporte@efipay.co y agregar como Secret.');
      }

      const efipayPayload: Record<string, any> = {
        payment: {
          amount: totalAmount,
          currency_type: EFIPAY_CURRENCY,   // variable configurable; CLP requiere activación por Efipay
          description: itemDescriptions.join(', ') || 'Pago cuota préstamo vehicular',
          checkout_type: 'redirect'
        },
        payer: {
          email: payerEmail,
          name: payerName
        },
        redirect_urls: {
          success: `${req.protocol}://${req.get('host')}/api/efipay-return?status=success`,
          failure: `${req.protocol}://${req.get('host')}/api/efipay-return?status=failure`
        },
        reference: idempotencyKey
      };

      // Incluir office solo si está configurado
      if (EFIPAY_OFFICE_ID) {
        efipayPayload.office = EFIPAY_OFFICE_ID;
      }

      console.log('🔄 Creando pago en Efipay...');
      console.log('🌐 Endpoint:', `${EFIPAY_BASE_URL}/api/v1/payment/generate-payment`);
      console.log('🔑 Token (primeros 10 chars):', EFIPAY_TOKEN.substring(0, 10) + '...');
      console.log('📤 Payload enviado:', JSON.stringify(efipayPayload, null, 2));

      // Helper para llamar Efipay con reintentos de endpoint
      async function callEfipayGeneratePayment(endpoint: string): Promise<{ status: number; data: any }> {
        const r = await fetch(`${EFIPAY_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: efipayHeaders,
          body: JSON.stringify(efipayPayload)
        });
        const data = await r.json() as any;
        console.log(`📦 Efipay ${endpoint} → status ${r.status}:`, JSON.stringify(data, null, 2));
        return { status: r.status, data };
      }

      // Paso 1: intentar generate-payment, si da 404 intentar generate-transaction
      let step1 = await callEfipayGeneratePayment('/api/v1/payment/generate-payment');
      if (step1.status === 404) {
        console.log('⚠️ /generate-payment dio 404, intentando /generate-transaction...');
        step1 = await callEfipayGeneratePayment('/api/v1/payment/generate-transaction');
      }

      if (step1.status !== 200 && step1.status !== 201) {
        return res.status(step1.status).json({
          success: false,
          error: step1.data?.message || step1.data?.error || 'Error al crear pago en Efipay',
          efipay_response: step1.data
        });
      }

      const step1Data = step1.data;
      const paymentId = step1Data.payment_id || step1Data.transaction_id || step1Data.id || idempotencyKey;

      // Extraer URL directamente del paso 1 si viene en la respuesta
      let checkoutUrl: string | null =
        step1Data.payment_url || step1Data.checkout_url || step1Data.redirect_url || step1Data.url || null;

      // Paso 2: si no hay URL pero hay id → hacer transaction-checkout
      if (!checkoutUrl && step1Data.id) {
        console.log('🔄 Sin URL en paso 1, llamando /transaction-checkout con id:', step1Data.id);
        const checkoutPayload = { payment: { id: step1Data.id } };
        const checkoutRes = await fetch(`${EFIPAY_BASE_URL}/api/v1/payment/transaction-checkout`, {
          method: 'POST',
          headers: efipayHeaders,
          body: JSON.stringify(checkoutPayload)
        });
        const checkoutData = await checkoutRes.json() as any;
        console.log('📦 transaction-checkout → status', checkoutRes.status, ':', JSON.stringify(checkoutData, null, 2));

        if (!checkoutRes.ok) {
          return res.status(checkoutRes.status).json({
            success: false,
            error: checkoutData?.message || checkoutData?.error || 'Error en checkout step',
            efipay_response: checkoutData
          });
        }
        checkoutUrl = checkoutData.payment_url || checkoutData.checkout_url || checkoutData.redirect_url || checkoutData.url || null;
      }

      if (!checkoutUrl) {
        console.error('❌ Efipay no devolvió URL de pago en ningún paso. Respuesta:', JSON.stringify(step1Data));
        return res.status(500).json({
          success: false,
          error: 'Efipay no devolvió una URL de pago válida',
          efipay_response: step1Data
        });
      }

      try {
        await storage.updatePaymentRequest(requestId, {
          paymentIntentId: paymentId,
          paidAmount: totalAmount.toString()
        });
      } catch (dbError) {
        console.error('❌ Error guardando paymentId:', dbError);
      }

      console.log('✅ Pago creado exitosamente en Efipay:', checkoutUrl);
      return res.json({ success: true, checkoutUrl, checkoutId: paymentId, amount: totalAmount });
      
    } catch (error: any) {
      console.error('❌ Error al generar enlace:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message,
        isFallback: true
      });
    }
  });

  // Efipay webhook endpoint - recibe resultados de pago
  app.post("/api/efipay-webhook", async (req: Request, res: Response) => {
    try {
      const webhookData = req.body;
      console.log('📩 Webhook de Efipay recibido:', JSON.stringify(webhookData));

      // Efipay puede enviar distintos campos según versión de API
      const {
        external_id,
        payment_id,
        transaction_id,
        status,
        amount,
        message
      } = webhookData;

      const externalId = external_id || payment_id || transaction_id;

      if (!externalId) {
        console.error('❌ Webhook inválido - falta external_id / payment_id');
        return res.status(400).json({ error: 'campos requeridos faltantes' });
      }

      // external_id format: requestId-quotaIndices
      const requestId = externalId.split('-')[0];

      let paymentRequest = await storage.getPaymentRequest(requestId);

      if (!paymentRequest) {
        const allRequests = await storage.getAllPaymentRequests();
        paymentRequest = allRequests.find(r => r.paymentIntentId === externalId) || undefined;
      }

      if (!paymentRequest) {
        console.error('❌ Solicitud no encontrada para:', externalId);
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      // Considerar aprobado si status es 'approved', 'success', 'completed' o 'APROBADA'
      const isApproved = ['approved', 'success', 'completed', 'APROBADA', 'paid'].includes(
        (status || '').toLowerCase()
      );

      if (isApproved) {
        console.log('✅ Pago aprobado por Efipay - ID:', externalId);

        await storage.updatePaymentRequest(paymentRequest.id, {
          status: 'completed',
          paymentIntentId: externalId,
          paidAmount: amount?.toString() || '0',
          paidAt: new Date().toISOString()
        });

        broadcastToAdmins({
          type: 'payment_confirmed',
          requestId: paymentRequest.id,
          amount: parseFloat(amount) || 0,
          paymentIntentId: externalId
        });

        broadcastToUser(paymentRequest.id, {
          type: 'payment_result',
          success: true,
          authorization: externalId,
          message: 'Pago aprobado exitosamente'
        });
      } else {
        console.error('❌ Pago rechazado por Efipay - status:', status, 'message:', message);

        await storage.updatePaymentRequest(paymentRequest.id, {
          status: 'rejected',
          failureReason: message || status || 'Pago rechazado'
        });

        broadcastToAdmins({
          type: 'payment_failed',
          requestId: paymentRequest.id,
          reason: message || status || 'Pago rechazado'
        });

        broadcastToUser(paymentRequest.id, {
          type: 'payment_result',
          success: false,
          message: message || 'Pago rechazado'
        });
      }

      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('❌ Error procesando webhook de Efipay:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Efipay redirect endpoint - el usuario vuelve aquí tras el pago
  app.get("/api/efipay-return", async (req: Request, res: Response) => {
    console.log('🔄 Usuario retornó de Efipay:', JSON.stringify(req.query));
    const status = req.query.status;
    if (status === 'success') {
      res.redirect('/payment-success');
    } else {
      res.redirect('/?payment=failed');
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
  
  const MAX_ADMIN_CLIENTS = 10;
  const adminConnectionTimes = new Map<string, number>();

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const clientType = url.searchParams.get('type') || 'user';
    const requestId = url.searchParams.get('requestId');

    for (let i = adminClients.length - 1; i >= 0; i--) {
      if (adminClients[i].ws.readyState !== WebSocket.OPEN) {
        adminClients.splice(i, 1);
      }
    }
    
    if (clientType === 'admin') {
      const ip = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const lastConn = adminConnectionTimes.get(ip) || 0;
      if (now - lastConn < 3000) {
        ws.close(1008, 'Rate limited');
        return;
      }
      adminConnectionTimes.set(ip, now);

      if (adminClients.length >= MAX_ADMIN_CLIENTS) {
        ws.close(1008, 'Too many admin connections');
        return;
      }

      const admin: AdminClient = { ws, isAdmin: true };
      adminClients.push(admin);
      
      console.log(`New admin connection (total: ${adminClients.length})`);
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
          const disconnectedClient = userClients[index];
          const savedClientId = disconnectedClient.clientId;
          const savedRut = disconnectedClient.rut || 'anónimo';

          disconnectedClient.connected = false;
          disconnectedClient.lastSeen = Date.now();

          notifyAdminsAboutUserStatus(disconnectedClient);

          setTimeout(() => {
            const currentIndex = userClients.findIndex(c => c.clientId === savedClientId);
            if (currentIndex !== -1 && !userClients[currentIndex].connected) {
              userClients.splice(currentIndex, 1);
              console.log(`Usuario ${savedRut} eliminado después de 5 minutos de inactividad`);
            }
          }, 5 * 60 * 1000);
        }
        console.log('Usuario desconectado');
      });
    }
  });

  return httpServer;
}