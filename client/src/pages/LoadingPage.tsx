import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { RouteComponentProps } from "wouter";
import ForumLoader from "@/components/ForumLoader";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LoadingPage(_props: RouteComponentProps) {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/payment/:requestId");
  const requestId = params?.requestId;
  
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("Procesando su pago...");
  const [response, setResponse] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  
  const contactInfo = {
    phone: "600 360 0077",
    hours: "Lun - Vie: 9:00 a 19:00"
  };
  
  // Función para actualizar todos los campos con datos del request
  const updateRequestData = (request: any) => {
    console.log('Actualizando datos de solicitud:', request);
    
    if (!request) return;
    
    // Guardar y procesar toda la información actualizada
    setStatus(request.status);
    
    // Set message based on status
    if (request.status === 'processing') {
      setMessage("Su solicitud está siendo procesada...");
    } else if (request.status === 'completed') {
      setMessage("¡Su pago ha sido aprobado!");
      
      // En caso de aprobación, actualizar todos los campos inmediatamente para garantizar que aparecen
      setResponse(request.response || '');
      setContractNumber(request.contractNumber || '');
      setVehicleType(request.vehicleType || '');
      setAmount(request.amount || '');
      setPaymentLink(request.paymentLink || '');
      
      console.log('Solicitud aprobada - campos actualizados:', {
        status: request.status,
        response: request.response || '',
        contractNumber: request.contractNumber || '',
        vehicleType: request.vehicleType || '',
        amount: request.amount || '',
        paymentLink: request.paymentLink || ''
      });
      
    } else if (request.status === 'rejected') {
      setMessage("Su pago ha sido rechazado");
      // En caso de rechazo, configurar solo la respuesta
      setResponse(request.response || '');
      console.log('Solicitud rechazada - configurando respuesta:', request.response || '');
    } else {
      // Para otros estados, actualizar campos individualmente
      // Set response if provided
      if (request.response !== undefined) {
        console.log('Setting response text:', request.response);
        setResponse(request.response);
      }
      
      // Set additional fields if provided
      if (request.contractNumber !== undefined) {
        console.log('Setting contract number:', request.contractNumber);
        setContractNumber(request.contractNumber);
      }
      
      if (request.vehicleType !== undefined) {
        console.log('Setting vehicle type:', request.vehicleType);
        setVehicleType(request.vehicleType);
      }
      
      if (request.amount !== undefined) {
        console.log('Setting amount:', request.amount);
        setAmount(request.amount);
      }
      
      if (request.paymentLink !== undefined) {
        console.log('Setting payment link:', request.paymentLink);
        setPaymentLink(request.paymentLink);
      }
    }
    
    setLoadingData(false);
  };
  
  // Fetch initial data
  useEffect(() => {
    if (!requestId) return;
    
    const fetchRequestStatus = async () => {
      try {
        console.log('Fetching request status for ID:', requestId);
        const response = await fetch(`/api/payment-request/${requestId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched request data:', data);
          updateRequestData(data);
        } else {
          console.error('Error fetching request status:', response.statusText);
          setLoadingData(false);
        }
      } catch (error) {
        console.error('Error fetching request status:', error);
        setLoadingData(false);
      }
    };
    
    fetchRequestStatus();
    
    // Configurar un intervalo para actualizar el estado cada 3 segundos
    const intervalId = setInterval(fetchRequestStatus, 3000);
    
    return () => clearInterval(intervalId);
  }, [requestId]);
  
  // Connect to WebSocket for real-time updates
  const { status: wsStatus, lastMessage, sendJsonMessage } = useWebSocket({
    url: `/ws?type=user&requestId=${requestId}`,
    onOpen: () => {
      console.log('WebSocket connection opened, sending request registration for request ID:', requestId);
      // Send a message to register this client with the specific requestId
      setTimeout(() => {
        sendJsonMessage({
          type: 'register_request',
          requestId
        });
        console.log('Registration message sent for request ID:', requestId);
      }, 500); // Pequeño retraso para asegurar que la conexión está completamente establecida
    },
    onMessage: (event) => {
      try {
        console.log('Client received message:', event.data);
        const data = JSON.parse(event.data);
        console.log('Parsed client message:', data);
        
        if (data.type === 'request_status' || data.type === 'request_update') {
          console.log('Processing request update for client, request data:', data.request);
          updateRequestData(data.request);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    }
  });
  
  // Redirect if no requestId
  useEffect(() => {
    if (!requestId) {
      setLocation("/");
    }
  }, [requestId, setLocation]);
  
  // Get color for status
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return "text-primary";
      case 'processing': return "text-blue-600";
      case 'completed': return "text-green-600";
      case 'rejected': return "text-red-600";
      default: return "text-primary";
    }
  };
  
  // Handle button click
  const handleButtonClick = () => {
    setLocation("/");
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F1F1]">
      <Header />
      
      <div className="flex-grow flex items-center justify-center px-4 py-8">
        {status === 'pending' || status === 'processing' ? (
          <ForumLoader />
        ) : (
          <Card className="max-w-[500px] w-full shadow-lg rounded-lg overflow-hidden mb-8">
            <div className="p-8 flex flex-col items-center">
              {status === 'completed' ? (
                <div className="mb-8 text-green-500 text-6xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                  </svg>
                </div>
              ) : (
                <div className="mb-8 text-red-500 text-6xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                  </svg>
                </div>
              )}
              
              <h2 className={`${getStatusColor()} text-xl font-medium text-center mb-4`}>
                {message}
              </h2>
              
              {response && (
                <p className="text-gray-700 text-center mb-6">{response}</p>
              )}
              
              {status === 'completed' && (
                <div className="w-full mb-6 border-t border-b py-4 border-gray-200">
                  {contractNumber && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600 font-medium">Número de Contrato:</span>
                      <span className="text-gray-800">{contractNumber}</span>
                    </div>
                  )}
                  
                  {vehicleType && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600 font-medium">Tipo de Vehículo:</span>
                      <span className="text-gray-800">{vehicleType}</span>
                    </div>
                  )}
                  
                  {amount && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600 font-medium">Monto:</span>
                      <span className="text-gray-800">{amount}</span>
                    </div>
                  )}
                  
                  {paymentLink && (
                    <div className="flex flex-col py-2">
                      <span className="text-gray-600 font-medium mb-2">Enlace de Pago:</span>
                      <a 
                        href={paymentLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-primary text-white py-2 px-4 rounded text-center hover:bg-opacity-90 transition-colors"
                      >
                        Realizar Pago
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {(status === 'completed' || status === 'rejected') && (
                <Button onClick={handleButtonClick} className="w-full py-3">
                  Volver al inicio
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
      
      <Footer />
    </div>
  );
}