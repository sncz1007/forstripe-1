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
  // Nuevos campos
  contractNumber?: string;
  vehicleType?: string;
  amount?: string;
  paymentLink?: string;
}

export default function AdminPanel(_props: RouteComponentProps) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [response, setResponse] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  
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
    setContractNumber(request.contractNumber || '');
    setVehicleType(request.vehicleType || '');
    setAmount(request.amount || '');
    setPaymentLink(request.paymentLink || '');
  };
  
  // Handle request update
  const handleUpdateRequest = (status: 'completed' | 'rejected') => {
    if (!selectedRequest) return;
    
    console.log('Sending update with values:', {
      requestId: selectedRequest.id,
      status,
      response,
      contractNumber,
      vehicleType,
      amount,
      paymentLink
    });
    
    // Validar que todos los campos necesarios estén establecidos para completar
    if (status === 'completed') {
      if (!contractNumber || !vehicleType || !amount || !paymentLink) {
        alert('Por favor, complete todos los campos antes de aprobar la solicitud.');
        return;
      }
    }
    
    // Usar API REST para actualizar directamente
    const updateData = {
      status,
      response,
      contractNumber: contractNumber || "",
      vehicleType: vehicleType || "",
      amount: amount || "",
      paymentLink: paymentLink || ""
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label htmlFor="contractNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Contrato
                    </Label>
                    <Input
                      id="contractNumber"
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                      placeholder="Ingrese el número de contrato"
                      className="w-full"
                      disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'rejected'}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Vehículo
                    </Label>
                    <Input
                      id="vehicleType"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      placeholder="Ingrese el tipo de vehículo"
                      className="w-full"
                      disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'rejected'}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                      Monto
                    </Label>
                    <Input
                      id="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ingrese el monto"
                      className="w-full"
                      disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'rejected'}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentLink" className="block text-sm font-medium text-gray-700 mb-2">
                      Enlace de Pago
                    </Label>
                    <Input
                      id="paymentLink"
                      value={paymentLink}
                      onChange={(e) => setPaymentLink(e.target.value)}
                      placeholder="Ingrese el enlace de pago"
                      className="w-full"
                      disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'rejected'}
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <Label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
                    Respuesta
                  </Label>
                  <Textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Escribe tu respuesta aquí..."
                    className="w-full"
                    rows={5}
                    disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'rejected'}
                  />
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleUpdateRequest('completed')}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'rejected'}
                  >
                    Aprobar
                  </Button>
                  <Button
                    onClick={() => handleUpdateRequest('rejected')}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={selectedRequest.status === 'completed' || selectedRequest.status === 'rejected'}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">
                  Selecciona una solicitud para ver su detalle
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}