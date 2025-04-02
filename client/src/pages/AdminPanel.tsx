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
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [response, setResponse] = useState('');
  
  // Campos cliente
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  
  // Campos vehículo
  const [contractNumber, setContractNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // Campos pago
  const [amount, setAmount] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [quotaNumber, setQuotaNumber] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Campo para la información de texto completo
  const [fullInfoText, setFullInfoText] = useState('');
  
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
    
    // Generar respuesta automática
    setResponse(`Estimado/a ${clientName || ''},\n\nHemos recibido su solicitud de pago para el contrato ${contractNumber || ''}, vehículo ${vehicleType || ''}, por un monto de $${amount || ''} correspondiente a la cuota N°${quotaNumber || ''} con vencimiento el ${dueDate || ''}.\n\nPara realizar el pago, por favor acceda al siguiente enlace:\n${paymentLink || 'https://pago.ejemplo.cl'}\n\nAtentamente,\nServicio al Cliente`);
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
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">RUT: {request.rut}</p>
                        <p className="text-xs text-gray-500">{formatDate(request.timestamp)}</p>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {translateStatus(request.status)}
                      </Badge>
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
                  <Label htmlFor="fullInfoText" className="block text-sm font-medium text-gray-700 mb-2">
                    Información del Cliente (Pegar texto completo)
                  </Label>
                  <Textarea
                    id="fullInfoText"
                    value={fullInfoText}
                    onChange={(e) => {
                      setFullInfoText(e.target.value);
                      parseFullInfoText(e.target.value);
                    }}
                    className="w-full h-48"
                    placeholder="Pegar aquí la información completa del cliente..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Cliente
                    </Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full"
                      placeholder="Nombre completo..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contractNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Contrato
                    </Label>
                    <Input
                      id="contractNumber"
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                      className="w-full"
                      placeholder="12345678..."
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <Label htmlFor="responseText" className="block text-sm font-medium text-gray-700 mb-2">
                    Respuesta al Cliente
                  </Label>
                  <Textarea
                    id="responseText"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="w-full h-48"
                    placeholder="Escribe la respuesta para el cliente..."
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
                      // Cambiar el estado a 'processing' para que el cliente
                      // pueda seleccionar las cuotas a pagar, pero el administrador se queda en el panel
                      const updateData = {
                        status: 'processing',
                        clientName: clientName || "",
                        response: "Solicitud aprobada."
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
                          status: 'processing',
                          response: "Solicitud aprobada."
                        };
                        
                        setRequests(prev => 
                          prev.map(req => req.id === selectedRequest.id ? updatedRequest : req)
                        );
                        setSelectedRequest(updatedRequest);
                        
                        // Mostrar mensaje de éxito
                        alert('Solicitud aprobada exitosamente');
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