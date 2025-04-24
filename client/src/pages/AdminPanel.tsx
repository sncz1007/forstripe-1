import React, { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RouteComponentProps } from "wouter";

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = sessionStorage.getItem('adminAuth');
    return auth === 'true';
  });
  const [password, setPassword] = useState('');
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [response, setResponse] = useState('');

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

  // Efecto para cargar solicitudes al iniciar
  useEffect(() => {
    fetchRequests();
    
    // Configurar un intervalo para actualizar las solicitudes cada 5 segundos
    const interval = setInterval(() => {
      fetchRequests();
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
      <div className="max-w-7xl mx-auto">
        <header className="bg-white p-4 rounded-lg shadow mb-6">
          <h1 className="text-2xl font-bold text-primary">Panel de Administración</h1>
          <p className="text-sm text-gray-500">
            Estado de la conexión: {status === 'open' ? 'Conectado' : status}
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests List */}
          <Card className="p-4 lg:col-span-1 h-[calc(100vh-180px)] overflow-auto">
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
          
          {/* Request Detail */}
          <Card className="p-4 lg:col-span-2 h-[calc(100vh-180px)] overflow-auto">
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
  );
}