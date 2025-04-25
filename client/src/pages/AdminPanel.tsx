import React, { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RouteComponentProps } from "wouter";
import { Notification } from "@/components/ui/notification";

interface PaymentRequest {
  id: string;
  rut: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  timestamp: number;
  response?: string;
  // Campos cliente
  clientName?: string;
  // Campos vehículo
  contractNumber?: string;
  vehicleType?: string;
  licensePlate?: string;
  paymentMethod?: string;
  // Campos pago
  amount?: string;
  paymentLink?: string;
  quotaNumber?: string;
  interestAmount?: string;
  totalAmount?: string;
  dueDate?: string;
}

export default function AdminPanel(_props: RouteComponentProps) {
  // Ya no necesitamos las referencias para los elementos de audio
  
  // Función ultrasimplificada para reproducir el sonido de nuevo usuario
  const playNewUserSound = () => {
    console.log("▶️ Reproduciendo sonido de nuevo usuario (Squirtle)");
    
    if (typeof window.playAudio === 'function') {
      window.playAudio('/sounds/squirtle.mp3');
    } else {
      // Fallback si la función global no está disponible
      const audio = new Audio('/sounds/squirtle.mp3');
      audio.volume = 1.0;
      audio.play().catch(e => console.error('Error reproduciendo sonido:', e));
    }
  };
  
  // Función ultrasimplificada para reproducir el sonido de pago completado
  const playCompletedPaymentSound = () => {
    console.log("▶️ Reproduciendo sonido de notificación de pago");
    
    if (typeof window.playAudio === 'function') {
      window.playAudio('/sounds/notification.mp3');
    } else {
      // Fallback si la función global no está disponible
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 1.0;
      audio.play().catch(e => console.error('Error reproduciendo sonido:', e));
    }
  };
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = sessionStorage.getItem('adminAuth');
    return auth === 'true';
  });
  const [password, setPassword] = useState('');
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [response, setResponse] = useState('');
  
  // Estado para los usuarios en línea
  interface OnlineUser {
    clientId: string;
    requestId?: string;
    rut?: string;
    connected: boolean;
    lastSeen: number;
    currentPage?: string;
    paymentStatus?: 'pending' | 'processing' | 'completed' | 'rejected';
  }
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  
  // Estado para las notificaciones
  interface NotificationMessage {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  
  // Función para añadir una notificación
  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `notification-${Date.now()}`;
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Quitar la notificación después de 6 segundos
    setTimeout(() => {
      removeNotification(id);
    }, 6000);
  };
  
  // Función para quitar una notificación por su ID
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === 'Nina1010@') {
      sessionStorage.setItem('adminAuth', 'true');
      setIsAuthenticated(true);
      await fetchRequests(); // Cargar las solicitudes después de autenticar
    } else {
      alert('Contraseña incorrecta');
      setPassword('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  const [fullInfoText, setFullInfoText] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [quotaNumber, setQuotaNumber] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Cargar solicitudes desde la API REST
  const fetchRequests = async () => {
    try {
      console.log('Obteniendo solicitudes del servidor...');
      const response = await fetch('/api/payment-requests');
      if (!response.ok) {
        throw new Error('Error al obtener las solicitudes');
      }
      const data = await response.json();
      console.log('Solicitudes obtenidas:', data);
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  // Función para cargar usuarios en línea
  const fetchOnlineUsers = async () => {
    try {
      console.log('Obteniendo usuarios conectados...');
      const response = await fetch('/api/online-users');
      if (!response.ok) {
        throw new Error('Error al obtener usuarios conectados');
      }
      const data = await response.json();
      console.log('Usuarios conectados:', data);
      setOnlineUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };

  // Efecto para cargar solicitudes al iniciar
  useEffect(() => {
    fetchRequests();
    fetchOnlineUsers();
    
    console.log('Inicializando sistema de sonido...');
    
    // Cargar el script de sonido ultra-simplificado
    const script = document.createElement('script');
    script.src = '/play-sound.js?v=20250425';
    script.id = 'play-sound-script';
    script.async = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      console.log('Sistema de reproducción de sonidos cargado correctamente');
      
      // Verificar si el script cargó correctamente
      if (typeof window.playAudio === 'function') {
        console.log('✅ Función playAudio disponible globalmente');
        
        // Probar reproducción en primer clic para habilitar
        document.addEventListener('click', function unlockAudio() {
          // Crear un Audio silencioso para desbloquear reproducción
          const silentAudio = new Audio("data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABGiAAQBCqgCRMAAgEAH///////////////7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq//////////////7cZYdOR2WX////+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==");
          silentAudio.play().then(() => {
            console.log('✅ Audio desbloqueado con éxito');
            
            // Reproducir un sonido muy corto para verificar que funciona
            setTimeout(() => {
              playNewUserSound();
            }, 500);
            
          }).catch(err => {
            console.log('❌ No se pudo desbloquear el audio:', err);
          });
          
          document.removeEventListener('click', unlockAudio);
        }, { once: true });
      } else {
        console.error('❌ Función playAudio no disponible, verificar carga del script');
      }
    };
    
    // La activación del audio ahora se maneja completamente en play-sound.js
    console.log('Sistema de audio se activará con la primera interacción del usuario');
    
    // Mostrar notificación para que el usuario interactúe y se desbloquee el audio
    addNotification('Haz clic en esta notificación para activar los sonidos de alerta', 'info');
    
    // Configurar un intervalo para actualizar solo los usuarios conectados cada 5 segundos
    // y las solicitudes que no estén completadas
    const interval = setInterval(() => {
      // Solo actualizar usuarios conectados automáticamente
      fetchOnlineUsers();
      
      // Para las solicitudes, evitamos sobreescribir las que ya están completadas
      // para mantener la información original
      fetch('/api/payment-requests')
        .then(response => response.json())
        .then(data => {
          console.log('Solicitudes obtenidas:', data);
          
          // Combinar las solicitudes nuevas con las existentes, pero mantener
          // la información original de las que ya están completadas
          setRequests(prevRequests => {
            // Crear un mapa con las solicitudes actuales para referencia rápida
            const currentRequestsMap = new Map();
            prevRequests.forEach(req => {
              currentRequestsMap.set(req.id, req);
            });
            
            // Procesar las nuevas solicitudes
            return data.map((newReq: PaymentRequest) => {
              const currentReq = currentRequestsMap.get(newReq.id);
              
              // Si la solicitud ya existe y está completada, mantener la versión existente
              if (currentReq && currentReq.status === 'completed') {
                console.log(`Manteniendo información original para solicitud completada: ${currentReq.id}`);
                return currentReq;
              }
              
              // De lo contrario, usar la nueva información
              return newReq;
            });
          });
        })
        .catch(error => {
          console.error('Error al obtener solicitudes:', error);
        });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Connect to WebSocket (solo para actualizaciones en tiempo real)
  const { status, lastMessage, sendJsonMessage } = useWebSocket({
    url: `/ws?type=admin`,
    onMessage: (event) => {
      try {
        console.log('Admin panel received message:', event.data);
        const data = JSON.parse(event.data);
        console.log('Admin panel parsed message:', data);
        
        // Actualizamos la lista completa después de cada actualización
        if (data.type === 'request_updated' || data.type === 'new_request') {
          console.log('Solicitud actualizada o nueva, refrescando lista completa...');
          fetchRequests();
          
          // Además, actualizar la seleccionada si corresponde
          if (data.type === 'request_updated' && selectedRequest?.id === data.request.id) {
            console.log('Actualizando solicitud seleccionada:', data.request);
            setSelectedRequest(data.request);
          }
        }
        
        // Procesar actualizaciones de estado de usuarios
        else if (data.type === 'users_status_list') {
          console.log('Recibida lista de usuarios conectados:', data.users);
          setOnlineUsers(data.users || []);
        }
        
        // Procesar actualización de un usuario específico
        else if (data.type === 'user_status_update') {
          console.log('Actualización de estado de usuario:', data.user);
          setOnlineUsers(prev => {
            // Buscar si el usuario ya existe en la lista
            const userIndex = prev.findIndex(u => u.clientId === data.user.clientId);
            
            if (userIndex !== -1) {
              // Actualizar usuario existente
              const updated = [...prev];
              updated[userIndex] = data.user;
              return updated;
            } else {
              // Agregar nuevo usuario y reproducir sonido de notificación
              console.log('¡Nuevo usuario conectado!', data.user);
              // Reproducir el sonido de Squirtle para alertar al administrador
              playNewUserSound();
              // Mostrar notificación visual
              const rutDisplay = data.user.rut ? ` (RUT: ${data.user.rut})` : '';
              addNotification(`¡Nuevo usuario conectado!${rutDisplay}`, 'info');
              return [...prev, data.user];
            }
          });
        }
        
        // Procesar actualización de una solicitud de pago
        else if (data.type === 'request_updated') {
          console.log('Solicitud actualizada:', data.request);
          
          // Actualizar la lista de solicitudes, pero preservar la información original
          // para solicitudes que ya estaban completadas
          setRequests(prev => {
            const requestIndex = prev.findIndex(r => r.id === data.request.id);
            if (requestIndex !== -1) {
              const currentRequest = prev[requestIndex];
              const updated = [...prev];
              
              // Usar enfoque basado en una función para evitar problemas de tipo
              const isCompleted = (status: string): boolean => status === 'completed';
              
              // Si la solicitud estaba completada, mantener su información original
              if (isCompleted(currentRequest.status)) {
                console.log(`La solicitud ${currentRequest.id} ya estaba marcada como completada, preservando información original`);
                // No actualizamos nada, mantenemos la información original
                return prev;
              } else if (isCompleted(data.request.status)) {
                // Si la solicitud ahora está completada pero antes no lo estaba,
                // actualizar su estado pero mantener toda la información detallada
                console.log(`La solicitud ${data.request.id} ahora está completada, actualizando estado`);
                updated[requestIndex] = { 
                  ...currentRequest, 
                  status: 'completed' as const,
                  // Actualizamos solo el paymentLink si existe en la nueva solicitud
                  paymentLink: data.request.paymentLink || currentRequest.paymentLink
                };
              } else {
                // Para cualquier otro cambio de estado, actualizar normalmente
                updated[requestIndex] = data.request;
              }
              
              // Si estamos viendo esta solicitud, actualizarla, manteniendo coherencia
              if (selectedRequest && selectedRequest.id === data.request.id) {
                if (isCompleted(currentRequest.status)) {
                  // Si ya estaba completada, no actualizamos el detalle
                } else if (isCompleted(data.request.status)) {
                  // Si ahora está completada, actualizar solo el estado
                  setSelectedRequest({
                    ...selectedRequest,
                    status: 'completed' as const,
                    paymentLink: data.request.paymentLink || selectedRequest.paymentLink
                  });
                } else {
                  // Para otros estados, actualizar normalmente
                  setSelectedRequest(data.request);
                }
              }
              
              return updated;
            }
            return prev;
          });
          
          // Si el estado cambió a "completed", mostrar una notificación
          if (data.request.status === 'completed') {
            // Reproducir sonido específico para alertar del pago completado
            playCompletedPaymentSound();
            console.log(`🔔 ¡IMPORTANTE! La solicitud ${data.request.id} ha sido PAGADA`);
            
            // Mostrar notificación visual
            const clientInfo = data.request.clientName || data.request.rut 
              ? `Cliente: ${data.request.clientName || ''} ${data.request.rut || ''}`
              : '';
            
            addNotification(`¡Pago completado! ${clientInfo}`, 'success');
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    }
  });
  
  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES');
  };
  
  // Función para analizar el texto completo
  const parseFullInfoText = (text: string) => {
    console.log("Analizando texto completo:", text);
    
    // Limpiar los estados previos
    setClientName('');
    setClientRut('');
    setContractNumber('');
    setVehicleType('');
    setLicensePlate('');
    setPaymentMethod('');
    setAmount('');
    setPaymentLink('');
    setQuotaNumber('');
    setInterestAmount('');
    setTotalAmount('');
    setDueDate('');
    
    // Dividir el texto en líneas para procesarlo
    const lines = text.split('\n');
    
    // Extraer información del cliente (primera línea)
    if (lines.length > 0) {
      setClientName(lines[0].trim());
    }
    
    // Buscar RUT en cualquier línea
    for (const line of lines) {
      // Buscar patrones de RUT como "17.546.765-3"
      if (line.match(/\d{1,2}\.\d{3}\.\d{3}-[\dkK]/)) {
        setClientRut(line.trim());
        break;
      }
    }
    
    // Buscar contrato, patente, vehículo
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Buscar contrato
      if (line.includes('Contrato') && i+1 < lines.length) {
        const contractLine = lines[i+1];
        const contractNumber = contractLine.trim();
        if (/^\d+$/.test(contractNumber)) {
          setContractNumber(contractNumber);
        }
      }
      
      // Buscar patente
      if (line.includes('Patente') && i+1 < lines.length) {
        setLicensePlate(lines[i+1].trim());
      }
      
      // Buscar vehículo
      if (line.includes('Vehículo') && i+1 < lines.length) {
        setVehicleType(lines[i+1].trim());
      }
      
      // Buscar PAC/PAT
      if (line.includes('PAC/PAT')) {
        const parts = line.split('PAC/PAT');
        if (parts.length > 1) {
          setPaymentMethod('PAC/PAT ' + parts[1].trim());
        }
      }
      
      // Buscar número de cuota
      if (line.includes('Cuota N°')) {
        const quotaMatch = line.match(/Cuota N°(\d+)/);
        if (quotaMatch && quotaMatch[1]) {
          setQuotaNumber(quotaMatch[1]);
        }
      }
      
      // Buscar montos ($)
      if (line.includes('$') && !line.includes('$0') && i > 0) {
        if (lines[i-1].includes('Cuota')) {
          const amountMatch = line.match(/\$([0-9.,]+)/);
          if (amountMatch && amountMatch[1]) {
            setAmount(amountMatch[1]);
          }
        }
        
        if (lines[i-1].includes('Total Cuota')) {
          const totalMatch = line.match(/\$([0-9.,]+)/);
          if (totalMatch && totalMatch[1]) {
            setTotalAmount(totalMatch[1]);
          }
        }
      }
      
      // Buscar interés
      if (line.includes('$0')) {
        setInterestAmount('0');
      }
      
      // Buscar fecha de vencimiento
      if (line.includes('Vence en')) {
        const daysMatch = line.match(/Vence en (\d+) días/);
        if (daysMatch && daysMatch[1]) {
          const daysToExpire = parseInt(daysMatch[1]);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + daysToExpire);
          setDueDate(dueDate.toLocaleDateString('es-ES'));
        }
      }
    }
    
    // Generar enlace de pago por defecto (ejemplo)
    setPaymentLink(`https://pago.ejemplo.cl/${contractNumber || '000000'}`);
    
    // Generar respuesta automática en un formato estructurado simple para fácil extracción
    setResponse(`Estimado/a ${clientName || 'Cliente'} ${clientRut || '12.345.678-9'}\n\n` +
    `Contrato: ${contractNumber || 'A12345'}\n` +
    `Patente: ${licensePlate || 'AB-CD-12'}\n` +
    `Vehículo: ${vehicleType || 'AUTOMÓVIL 2023'}\n\n` +
    `Cuota N°${quotaNumber || '1'}\n` +
    `Vence en ${dueDate ? '5' : '10'} días\n` +
    `Monto: $${amount || '100.000'}\n` +
    `Interés: $${interestAmount || '0'}\n` +
    `Total: $${totalAmount || '100.000'}\n\n` +
    `Para realizar el pago, por favor acceda al siguiente enlace:\n${paymentLink || 'https://pago.ejemplo.cl'}\n\n` +
    `Atentamente,\nServicio al Cliente`);
  };

  // Handle request selection
  const handleSelectRequest = (request: PaymentRequest) => {
    setSelectedRequest(request);
    
    // Mark as processing if it's pending
    if (request.status === 'pending') {
      const updatedRequest = { ...request, status: 'processing' as const };
      
      sendJsonMessage({
        type: 'update_request',
        requestId: request.id,
        status: 'processing'
      });
      
      // Update local state
      setRequests(prev => 
        prev.map(req => req.id === request.id ? updatedRequest : req)
      );
      setSelectedRequest(updatedRequest);
    }
    
    // Configurar los valores actuales si existen
    setResponse(request.response || '');
    setClientName(request.clientName || '');
    setClientRut(request.rut || '');
    setContractNumber(request.contractNumber || '');
    setVehicleType(request.vehicleType || '');
    setLicensePlate(request.licensePlate || '');
    setPaymentMethod(request.paymentMethod || '');
    setAmount(request.amount || '');
    setPaymentLink(request.paymentLink || '');
    setQuotaNumber(request.quotaNumber || '');
    setInterestAmount(request.interestAmount || '');
    setTotalAmount(request.totalAmount || '');
    setDueDate(request.dueDate || '');
    
    // Limpiar el campo de texto completo
    setFullInfoText('');
  };
  
  // Handle request update
  const handleUpdateRequest = (status: 'processing' | 'completed' | 'rejected') => {
    if (!selectedRequest) return;
    
    console.log('Sending update with values:', {
      requestId: selectedRequest.id,
      status,
      response,
      clientName,
      clientRut,
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
    });
    
    // Para ir directamente a la página de cuotas
    if (status === 'processing') {
      // No necesitamos validaciones extras para este estado
      console.log('Procesando solicitud para página de cuotas');
    }
    // Validar que todos los campos necesarios estén establecidos para completar
    else if (status === 'completed') {
      if (!contractNumber || !vehicleType || !amount || !paymentLink) {
        alert('Por favor, complete todos los campos antes de aprobar la solicitud.');
        return;
      }
    }
    
    // Usar API REST para actualizar directamente
    const updateData = {
      status,
      response,
      clientName: clientName || "",
      contractNumber: contractNumber || "",
      vehicleType: vehicleType || "",
      licensePlate: licensePlate || "",
      paymentMethod: paymentMethod || "",
      amount: amount || "",
      paymentLink: paymentLink || "",
      quotaNumber: quotaNumber || "",
      interestAmount: interestAmount || "",
      totalAmount: totalAmount || "",
      dueDate: dueDate || ""
    };
    
    // Actualizar usando fetch en lugar de WebSocket
    fetch(`/api/payment-request/${selectedRequest.id}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al actualizar la solicitud');
      }
      return response.json();
    })
    .then(data => {
      console.log('Solicitud actualizada exitosamente:', data);
      
      // Actualizar estado local
      const updatedRequest = { 
        ...selectedRequest, 
        ...updateData
      };
      
      setRequests(prev => 
        prev.map(req => req.id === selectedRequest.id ? updatedRequest : req)
      );
      setSelectedRequest(updatedRequest);
      
      // Refrescar la lista completa
      fetchRequests();
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Hubo un problema al actualizar la solicitud. Por favor, inténtelo de nuevo.');
    });
  };
  
  // Get color for status badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Translate status
  const translateStatus = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'processing': return 'En proceso';
      case 'completed': return 'Completado';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Elementos de audio ocultos */}
      <audio ref={newUserAudioRef} src="/sounds/squirtle.mp3" preload="auto" />
      <audio ref={completedPaymentAudioRef} src="/sounds/notification.mp3" preload="auto" />
      
      {/* Contenedor de notificaciones */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
      
      <div className="max-w-7xl mx-auto">
        <header className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">Panel de Administración</h1>
              <p className="text-sm text-gray-500">
                Estado de la conexión: {status === 'open' ? 'Conectado' : status}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white shadow rounded-lg p-2">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className="inline-flex h-3 w-3 rounded-full bg-green-500 mr-2"></span>
                    <span className="text-sm font-medium">
                      {onlineUsers.filter(u => u.connected).length} usuarios en línea
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        playNewUserSound();
                        addNotification("Sonido de nuevo usuario (Squirtle)", "info");
                      }}
                      className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                      title="Probar sonido de nuevo usuario"
                    >
                      🔊 Squirtle
                    </button>
                    <button
                      onClick={() => {
                        playCompletedPaymentSound();
                        addNotification("Sonido de pago completado", "success");
                      }}
                      className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded"
                      title="Probar sonido de pago completado"
                    >
                      🔊 Pago
                    </button>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que deseas limpiar todas las solicitudes? Esta acción no se puede deshacer.')) {
                    // Llamar al API para limpiar el panel
                    fetch('/api/admin/clean', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    })
                    .then(response => {
                      if (!response.ok) {
                        throw new Error('Error al limpiar el panel de administración');
                      }
                      return response.json();
                    })
                    .then(data => {
                      console.log('Panel limpiado:', data);
                      
                      // Limpiar las solicitudes localmente
                      setRequests([]);
                      setSelectedRequest(null);
                      setOnlineUsers([]);
                      
                      // Mostrar mensaje de éxito
                      alert('Panel de administración limpiado con éxito');
                      
                      // Recargar nuevamente los datos (conservará la solicitud de prueba)
                      fetchRequests();
                    })
                    .catch(error => {
                      console.error('Error:', error);
                      alert('Hubo un problema al limpiar el panel. Por favor, inténtelo de nuevo.');
                    });
                  }
                }}
              >
                Limpiar Panel
              </Button>
            </div>
          </div>
        </header>
        
        <div className="lg:flex gap-6">
          {/* Columna Izquierda */}
          <div className="lg:w-1/3 space-y-6">
            {/* Requests List */}
            <Card className="p-4 h-[calc(100vh-400px)] overflow-auto">
              <h2 className="text-lg font-semibold mb-4">Solicitudes de Pago</h2>
              
              {requests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay solicitudes pendientes
                </p>
              ) : (
                <div className="space-y-3">
                  {requests.map(request => (
                    <div 
                      key={request.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 
                        ${selectedRequest?.id === request.id ? 'border-primary bg-blue-50' : 'border-gray-200'}`}
                      onClick={() => handleSelectRequest(request)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">RUT: <span className="text-base">{request.rut}</span></p>
                          <p className="text-xs text-gray-500">{formatDate(request.timestamp)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(request.status)}>
                            {translateStatus(request.status)}
                          </Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(request.rut);
                              alert('RUT copiado al portapapeles');
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full"
                            title="Copiar RUT"
                          >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="20" 
                              height="20" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            
            {/* Active Users Section */}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Usuarios Activos</h2>
                <Badge className="bg-green-500">
                  {onlineUsers.filter(u => u.connected).length} en línea
                </Badge>
              </div>
              
              {onlineUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay usuarios conectados actualmente
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {onlineUsers.map(user => (
                    <div 
                      key={user.clientId}
                      className={`p-2 border rounded-lg ${user.connected ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className={`inline-flex h-2 w-2 rounded-full ${user.connected ? 'bg-green-500' : 'bg-gray-400'} mr-2`}></span>
                            <p className="font-medium">
                              {user.rut || 'Usuario sin RUT'} 
                              {user.connected ? ' (en línea)' : ' (desconectado)'}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 ml-4">
                            ID: {user.requestId || 'Sin solicitud'}
                          </p>
                          <p className="text-xs text-gray-500 ml-4">
                            Última actividad: {formatDate(user.lastSeen)}
                          </p>
                          {user.currentPage && (
                            <p className="text-xs ml-4 font-medium">
                              Página actual: {user.currentPage === 'pasarela_pago' ? (
                                <span className="text-orange-600 font-bold">EN PASARELA DE PAGO</span>
                              ) : (
                                <span className="text-blue-600">{
                                  user.currentPage === 'indice' ? 'Ingreso RUT' :
                                  user.currentPage === 'intermedio' ? 'Selección de proveedor' :
                                  user.currentPage === 'checkout' ? 'Selección de cuotas' :
                                  user.currentPage === 'pagado' ? 'Comprobante de pago' :
                                  user.currentPage
                                }</span>
                              )}
                            </p>
                          )}
                          {user.paymentStatus && (
                            <p className="text-xs ml-4 font-medium">
                              Estado: {user.paymentStatus === 'completed' ? (
                                <span className="text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">
                                  PAGADO
                                </span>
                              ) : (
                                <span className={`${
                                  user.paymentStatus === 'processing' ? 'text-blue-600' : 
                                  user.paymentStatus === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                                  {user.paymentStatus === 'processing' ? 'Procesando' : 
                                   user.paymentStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div>
                          {user.connected && (
                            <button 
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                              onClick={() => {
                                // Buscar solicitud asociada con el RUT
                                const relatedRequest = requests.find(req => req.rut === user.rut);
                                if (relatedRequest) {
                                  handleSelectRequest(relatedRequest);
                                } else {
                                  alert(`No se encontró una solicitud asociada al RUT: ${user.rut || 'desconocido'}`);
                                }
                              }}
                              disabled={!user.rut}
                              title={user.rut ? "Ver solicitud" : "El usuario no tiene RUT registrado"}
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className="mr-1"
                              >
                                <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z"></path>
                                <line x1="8" y1="10" x2="16" y2="10"></line>
                                <line x1="8" y1="14" x2="16" y2="14"></line>
                                <line x1="8" y1="18" x2="12" y2="18"></line>
                              </svg>
                              Ver
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
          
          {/* Columna Derecha */}
          <div className="lg:w-2/3 mt-6 lg:mt-0">
            {/* Request Detail */}
            <Card className="p-4 h-[calc(100vh-180px)] overflow-auto">
            {selectedRequest ? (
              <div>
                <h2 className="text-lg font-semibold mb-4">Detalle de la Solicitud</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-gray-500">ID</p>
                    <p>{selectedRequest.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">RUT</p>
                    <p>{selectedRequest.rut}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fecha</p>
                    <p>{formatDate(selectedRequest.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Estado</p>
                    <Badge className={getStatusColor(selectedRequest.status)}>
                      {translateStatus(selectedRequest.status)}
                    </Badge>
                  </div>
                </div>
                
                <div className="mb-6">
                  <Label htmlFor="responseText" className="block text-sm font-medium text-gray-700 mb-2">
                    Información del Cliente (Ingrese texto en formato)
                  </Label>
                  <Textarea
                    id="responseText"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="w-full h-72"
                    placeholder={`DANIEL GASTELBONDO JUNIOR
17.546.764-3
Cuotas a pagar
Método de pago
Comprobante de pago
Contrato
744530
PAC/PAT Activo

Cuota N°6
Cuota
Interés Mora
Total Cuota
Venció el 05/04/2025
$1.359.000
$0
$1.359.000

Contrato
1210457
PAC/PAT Activo

El pago vía PAC/PAT puede tardar hasta 5 días hábiles en verse reflejado.

** Si el cargo se hubiera realizado dentro de la fecha de pago correspondiente, no se aplicará el interés por mora señalado

Cuota N°3
Cuota
Interés Mora
Total Cuota
Vence en 27 días
$917.000
$0
$917.000`}
                  />
                </div>
                
                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateRequest('rejected')}
                    className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
                    disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'rejected'}
                  >
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => {
                      // Verificar si hay texto en el campo de respuesta
                      if (!response || response.trim() === '') {
                        // Si no hay respuesta, alerta al usuario
                        alert('Por favor, escriba la información del cliente en el campo "Respuesta al Cliente" antes de aprobar.');
                        return;
                      }
                      
                      // Cambiar el estado a 'processing' para que el cliente pueda ver la información
                      // Simplificamos para usar solo el campo de respuesta
                      const updateData = {
                        status: 'processing',
                        response: response  // Usar el texto completo del campo respuesta para toda la información
                      };
                      
                      fetch(`/api/payment-request/${selectedRequest.id}/update`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updateData),
                      })
                      .then(response => {
                        if (!response.ok) {
                          throw new Error('Error al actualizar la solicitud');
                        }
                        return response.json();
                      })
                      .then(data => {
                        console.log('Solicitud aprobada exitosamente:', data);
                        
                        // Actualizar la solicitud en el estado local para reflejar el cambio
                        const updatedRequest: PaymentRequest = { 
                          ...selectedRequest, 
                          ...updateData,
                          status: 'processing'
                        };
                        
                        setRequests(prev => 
                          prev.map(req => req.id === selectedRequest.id ? updatedRequest : req)
                        );
                        setSelectedRequest(updatedRequest);
                        
                        // Mostrar mensaje de éxito
                        alert('Solicitud aprobada exitosamente. El cliente podrá ver la información de sus cuotas.');
                      })
                      .catch(error => {
                        console.error('Error:', error);
                        alert('Hubo un problema al actualizar la solicitud. Por favor, inténtelo de nuevo.');
                      });
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'rejected'}
                  >
                    Aprobar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-500">
                  Seleccione una solicitud para ver los detalles
                </p>
              </div>
            )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}