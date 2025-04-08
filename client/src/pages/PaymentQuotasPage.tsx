import React, { useState, useEffect } from "react";
import { RouteComponentProps, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/use-websocket";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ForumLoader from "@/components/ForumLoader";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiRequest } from "@/lib/queryClient";

// Componente personalizado de checkbox con un check (chulo) visible
interface CustomCheckboxProps {
  checked: boolean;
  onChange: () => void;
  id: string;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, onChange, id }) => {
  return (
    <div 
      className={`relative w-5 h-5 border rounded cursor-pointer mr-3 flex items-center justify-center ${checked ? 'bg-[#009ADE] border-[#009ADE]' : 'border-gray-400 bg-white'}`}
      onClick={onChange}
    >
      {checked && (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      )}
      <input 
        type="checkbox" 
        id={id}
        checked={checked} 
        onChange={onChange} 
        className="sr-only" // oculto visualmente pero accesible
      />
    </div>
  );
};

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
  dueDate?: string; // Para almacenar la fecha exacta de vencimiento o estado
}

interface UserInfo {
  clientName: string;
  clientRut: string;
  showPacPatSubscription: boolean;
  quotas: QuotaInfo[];
  warningMessage?: string;
}

interface PaymentQuotasProps extends RouteComponentProps {}

export default function PaymentQuotasPage(_props: PaymentQuotasProps) {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true); // Comienza en true para mostrar loading
  const [selectedQuotas, setSelectedQuotas] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [userData, setUserData] = useState<UserInfo | null>(null);
  
  // Función para extraer datos desde la respuesta del administrador
  const extractUserDataFromResponse = (responseText: string): UserInfo | null => {
    try {
      console.log("Analizando respuesta:", responseText);
      
      if (!responseText) return null;
      
      // Separar el texto en líneas para facilitar el procesamiento
      const lines = responseText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      console.log("Líneas:", lines);
      
      if (lines.length === 0) {
        console.log("No hay líneas para procesar en la respuesta");
        return null;
      }
      
      // Inicializar los valores predeterminados
      let clientName = "CRISTIAN SERVANDO VALENZUELA BUSTOS";
      let clientRut = sessionStorage.getItem('rutValue') || "17.546.765-3";
      let contractNumber = "000000";
      let licensePlate = "XX-XX-XX";
      let vehicleType = "AUTOMÓVIL";
      let quotaNumber = "1";
      let daysUntilDue = 10;
      let quotaAmount = "$0";
      let interestAmount = "$0";
      let totalAmount = "$0";
      let pacPatActive = false;
      
      // Extraer nombre y RUT de la primera línea
      const firstLine = lines[0] || "";
      const nameRutMatch = firstLine.match(/Estimado\/a\s+([A-ZÁÉÍÓÚÑ\s]+)\s+(\d{1,2}\.\d{3}\.\d{3}-[0-9kK])/);
      
      if (nameRutMatch) {
        clientName = nameRutMatch[1].trim();
        clientRut = nameRutMatch[2].trim();
        console.log("Nombre extraído:", clientName);
        console.log("RUT extraído:", clientRut);
        
        // Guardar en sessionStorage para uso posterior
        sessionStorage.setItem('clientName', clientName);
        sessionStorage.setItem('rutValue', clientRut);
      } else {
        // Buscar RUT en cualquier línea
        for (const line of lines) {
          const rutMatch = line.match(/(\d{1,2}\.\d{3}\.\d{3}-[0-9kK])/);
          if (rutMatch) {
            clientRut = rutMatch[1];
            console.log("RUT extraído (alt):", clientRut);
            // Guardar el RUT en sessionStorage
            sessionStorage.setItem('rutValue', clientRut);
            break;
          }
        }
        
        // Intentar extraer el nombre si hay una línea que empieza con "Estimado/a" o similar
        for (const line of lines) {
          if (line.includes("Estimado/a") || line.includes("Estimado") || line.includes("Cliente:")) {
            const nameMatch = line.match(/(?:Estimado\/a|Estimado|Cliente:)\s+([A-ZÁÉÍÓÚÑ\s]+)/i);
            if (nameMatch && nameMatch[1]) {
              clientName = nameMatch[1].trim();
              console.log("Nombre extraído (alt):", clientName);
              // Guardar el nombre en sessionStorage
              sessionStorage.setItem('clientName', clientName);
              break;
            }
          }
        }
      }
      
      // Buscar información de contrato y vehículo en cada línea
      for (const line of lines) {
        // Buscar contrato con varios formatos posibles
        if (line.includes("Contrato:") || line.includes("Contrato")) {
          const match = line.match(/Contrato:?\s*([A-Z0-9]+)/);
          if (match) {
            contractNumber = match[1].trim();
            console.log("Contrato encontrado:", contractNumber);
          } else if (line.trim() === "Contrato" && lines.length > lines.indexOf(line) + 1) {
            // Si la línea solo dice "Contrato", el número podría estar en la siguiente línea
            const nextLine = lines[lines.indexOf(line) + 1];
            if (nextLine && !nextLine.includes(":")) {
              contractNumber = nextLine.trim();
              console.log("Contrato encontrado (siguiente línea):", contractNumber);
            }
          }
        }
        
        // Buscar patente con varios formatos posibles
        if (line.includes("Patente:") || line.includes("Patente")) {
          const match = line.match(/Patente:?\s*([A-Z0-9•-]+)/);
          if (match) {
            licensePlate = match[1].trim();
            console.log("Patente encontrada:", licensePlate);
          } else if (line.trim() === "Patente" && lines.length > lines.indexOf(line) + 1) {
            // Si la línea solo dice "Patente", la patente podría estar en la siguiente línea
            const nextLine = lines[lines.indexOf(line) + 1];
            if (nextLine && !nextLine.includes(":")) {
              licensePlate = nextLine.trim();
              console.log("Patente encontrada (siguiente línea):", licensePlate);
            }
          }
        }
        
        // Buscar vehículo con varios formatos posibles
        if (line.includes("Vehículo:") || line.includes("Vehículo")) {
          const match = line.match(/Vehículo:?\s*(.+)/);
          if (match) {
            vehicleType = match[1].trim();
            console.log("Vehículo encontrado:", vehicleType);
          } else if (line.trim() === "Vehículo" && lines.length > lines.indexOf(line) + 1) {
            // Si la línea solo dice "Vehículo", el tipo podría estar en la siguiente línea
            const nextLine = lines[lines.indexOf(line) + 1];
            if (nextLine && !nextLine.includes(":")) {
              vehicleType = nextLine.trim();
              console.log("Vehículo encontrado (siguiente línea):", vehicleType);
            }
          }
        }
        
        // Buscar número de cuota
        if (line.includes("Cuota N°") || line.match(/Cuota\s+N[°o]?\s*\d+/)) {
          const match = line.match(/Cuota\s+N[°o]?\s*(\d+)/);
          if (match) {
            quotaNumber = match[1];
            console.log("Número de cuota:", quotaNumber);
          }
        }
        
        // Buscar días hasta vencimiento
        if (line.includes("Vence en") || line.includes("Vence")) {
          const match = line.match(/Vence\s+en\s+(\d+)\s+días?/);
          if (match) {
            daysUntilDue = parseInt(match[1]);
            console.log("Días hasta vencimiento:", daysUntilDue);
          }
        }
        
        // Buscar importes monetarios de cuota, interés y total
        if (line.includes("$")) {
          // Buscar monto de cuota
          if (line.toLowerCase().includes("monto") || line.toLowerCase().includes("cuota")) {
            const match = line.match(/\$\s*([0-9.,]+)/);
            if (match) {
              quotaAmount = "$" + match[1];
              console.log("Monto de cuota:", quotaAmount);
            }
          }
          
          // Buscar interés
          else if (line.toLowerCase().includes("interés")) {
            const match = line.match(/\$\s*([0-9.,]+)/);
            if (match) {
              interestAmount = "$" + match[1];
              console.log("Interés:", interestAmount);
            }
          }
          
          // Buscar total
          else if (line.toLowerCase().includes("total")) {
            const match = line.match(/\$\s*([0-9.,]+)/);
            if (match) {
              totalAmount = "$" + match[1];
              console.log("Total:", totalAmount);
            }
          }
          
          // Intentar adivinar el tipo de importe por su posición después de etiquetas
          else {
            const lineIdx = lines.indexOf(line);
            if (lineIdx > 0) {
              const prevLine = lines[lineIdx - 1].toLowerCase();
              if (prevLine.includes("cuota") && !prevLine.includes("total")) {
                const match = line.match(/\$\s*([0-9.,]+)/);
                if (match) {
                  quotaAmount = "$" + match[1];
                  console.log("Monto de cuota (inferido):", quotaAmount);
                }
              } else if (prevLine.includes("interés")) {
                const match = line.match(/\$\s*([0-9.,]+)/);
                if (match) {
                  interestAmount = "$" + match[1];
                  console.log("Interés (inferido):", interestAmount);
                }
              } else if (prevLine.includes("total")) {
                const match = line.match(/\$\s*([0-9.,]+)/);
                if (match) {
                  totalAmount = "$" + match[1];
                  console.log("Total (inferido):", totalAmount);
                }
              }
            }
          }
        }
      }
      
      // Determinar si debe mostrar suscripción PAC/PAT
      const showPacPat = responseText.includes("Suscripción automática a PAC o PAT") || 
                          responseText.includes("PAC o PAT") ||
                          responseText.includes("suscribir el pago");
      
      console.log("Mostrar PAC/PAT:", showPacPat);
      
      // Extraer información de advertencia si existe
      let warningMessage: string | undefined = undefined;
      if (responseText.includes("El pago vía PAC/PAT puede tardar")) {
        const warningRegex = /(El pago vía PAC\/PAT puede tardar[^]*?\*\*[^]*?señalado)/;
        const warningMatch = responseText.match(warningRegex);
        warningMessage = warningMatch ? warningMatch[1] : undefined;
        console.log("Mensaje de advertencia extraído:", warningMessage);
      }
      
      // Crear la cuota con la información extraída
      const quotas: QuotaInfo[] = [{
        contractNumber,
        licensePlate,
        vehicleType,
        pacPatActive,
        quotaNumber,
        quotaAmount,
        interestAmount,
        totalAmount,
        daysUntilDue
      }];
      
      console.log("Cuota extraída:", quotas[0]);
      
      // Si no se encontraron cuotas pero hay información de contrato, intentamos un enfoque alternativo
      if (quotas.length === 0 && responseText.includes("Contrato")) {
        console.log("Enfoque alternativo para extraer cuotas");
        
        // Buscar información del contrato
        const contractNumberMatch = responseText.match(/Contrato\s+([A-Z0-9]+)/);
        const licensePlateMatch = responseText.match(/Patente\s+([A-Z0-9•-]+)/);
        const vehicleTypeMatch = responseText.match(/Vehículo\s+([A-ZÁÉÍÓÚÑ0-9\s]+)/);
        
        const contractNumber = contractNumberMatch ? contractNumberMatch[1].trim() : "N/A";
        const licensePlate = licensePlateMatch ? licensePlateMatch[1].trim() : "XX-XX-XX";
        const vehicleType = vehicleTypeMatch ? vehicleTypeMatch[1].trim() : "VEHÍCULO";
        const pacPatActive = responseText.includes("PAC/PAT Activo");
        
        // Buscar información de cuota
        const quotaNumberMatch = responseText.match(/Cuota N°(\d+)/);
        const daysMatch = responseText.match(/Vence en (\d+) días?/);
        const amountMatches = responseText.match(/\$([0-9.]+)(?:\s+\$([0-9.]+))?(?:\s+\$([0-9.]+))?/);
        
        if (quotaNumberMatch || daysMatch || amountMatches) {
          const quotaNumber = quotaNumberMatch ? quotaNumberMatch[1] : "1";
          const daysUntilDue = daysMatch ? parseInt(daysMatch[1]) : 10;
          
          let quotaAmount = "$0";
          let interestAmount = "$0"; 
          let totalAmount = "$0";
          
          if (amountMatches) {
            if (amountMatches[1]) quotaAmount = "$" + amountMatches[1];
            if (amountMatches[2]) interestAmount = "$" + amountMatches[2];
            if (amountMatches[3]) totalAmount = "$" + amountMatches[3];
          }
          
          quotas.push({
            contractNumber,
            licensePlate,
            vehicleType,
            pacPatActive,
            quotaNumber,
            quotaAmount,
            interestAmount,
            totalAmount,
            daysUntilDue
          });
          
          console.log("Cuota extraída (enfoque alternativo):", quotas[0]);
        }
      }
      
      // Si aún no hay cuotas, crear una por defecto para evitar errores
      if (quotas.length === 0) {
        console.log("No se encontraron cuotas, creando una por defecto");
        quotas.push({
          contractNumber: "000000",
          licensePlate: "XX-XX-XX",
          vehicleType: "AUTOMÓVIL",
          pacPatActive: false,
          quotaNumber: "1",
          quotaAmount: "$0",
          interestAmount: "$0",
          totalAmount: "$0",
          daysUntilDue: 10
        });
      }
      
      return {
        clientName,
        clientRut,
        showPacPatSubscription: showPacPat,
        quotas,
        warningMessage
      };
    } catch (error) {
      console.error("Error al extraer datos del usuario:", error);
      return null;
    }
  };
  
  useEffect(() => {
    // Obtener información desde sessionStorage y del API
    const requestId = sessionStorage.getItem('paymentRequestId');
    
    const fetchRequestData = async () => {
      if (!requestId) {
        setIsLoading(false);
        return;
      }
      
      try {
        console.log("Obteniendo datos para requestId:", requestId);
        const response = await fetch(`/api/payment-request/${requestId}`);
        if (!response.ok) {
          throw new Error('Error al obtener datos de la solicitud');
        }
        
        const data = await response.json();
        console.log("Datos recibidos del API:", data);
        
        if (data.response) {
          console.log("Texto de respuesta encontrado:", data.response);
          // La solicitud fue aprobada y tiene una respuesta
          const extractedData = extractUserDataFromResponse(data.response);
          console.log("Datos extraídos:", extractedData);
          if (extractedData) {
            setUserData(extractedData);
          } else {
            console.log("No se pudieron extraer datos, usando valores predeterminados");
            // Si no se puede extraer, usar datos predeterminados
            fallbackToDefaultData();
          }
        } else {
          console.log("Sin texto de respuesta, usando valores predeterminados");
          // Usar datos predeterminados si no hay respuesta
          fallbackToDefaultData();
        }
      } catch (error) {
        console.error("Error al obtener datos:", error);
        fallbackToDefaultData();
      } finally {
        setIsLoading(false);
      }
    };
    
    // Datos predeterminados en caso de error
    const fallbackToDefaultData = () => {
      const rutValue = sessionStorage.getItem('rutValue');
      
      if (rutValue === "18.430.589-5") {
        // Datos para Manuel Alejandro
        setUserData({
          clientName: "MANUEL ALEJANDRO VALENZUELA SEPULVEDA",
          clientRut: "18.430.589-5",
          showPacPatSubscription: true,
          quotas: [
            {
              contractNumber: "LB562359",
              licensePlate: "TF-XX-XX",
              vehicleType: "PEUGEOT XXXXX 2024",
              pacPatActive: false,
              quotaNumber: "16",
              quotaAmount: "$391.296",
              interestAmount: "$0",
              totalAmount: "$391.296",
              daysUntilDue: 1
            }
          ]
        });
      } else {
        // Datos predeterminados para Cristian Servando
        setUserData({
          clientName: "CRISTIAN SERVANDO VALENZUELA BUSTOS",
          clientRut: "17.546.765-3",
          showPacPatSubscription: false,
          quotas: [
            {
              contractNumber: "744530",
              licensePlate: "XX-XX-XX",
              vehicleType: "PEUGEOT XXXXX 2025",
              pacPatActive: true,
              quotaNumber: "6",
              quotaAmount: "$1.358.270",
              interestAmount: "$0",
              totalAmount: "$1.358.270",
              daysUntilDue: 0
            },
            {
              contractNumber: "1210457",
              licensePlate: "XX-XX-XX",
              vehicleType: "CHEVROLET XXXXXXXXX 2023",
              pacPatActive: true,
              quotaNumber: "3",
              quotaAmount: "$917.539",
              interestAmount: "$0",
              totalAmount: "$917.539",
              daysUntilDue: 28
            }
          ],
          warningMessage: "El pago vía PAC/PAT puede tardar hasta 5 días hábiles en verse reflejado.\n** Si el cargo se hubiera realizado dentro de la fecha de pago correspondiente, no se aplicará el interés por mora señalado"
        });
      }
    };
    
    fetchRequestData();
    
    // Configurar WebSocket para obtener actualizaciones
    if (requestId) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      const wsClient = new WebSocket(wsUrl);
      
      wsClient.onopen = () => {
        wsClient.send(JSON.stringify({ type: 'register', requestId }));
      };
      
      wsClient.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'request_status' && data.request.status === 'processing' && data.request.response) {
            const extractedData = extractUserDataFromResponse(data.request.response);
            if (extractedData) {
              setUserData(extractedData);
              setIsLoading(false);
            }
          }
        } catch (error) {
          console.error("Error procesando mensaje WebSocket:", error);
        }
      };
      
      return () => {
        wsClient.close();
      };
    }
  }, []);
  
  // Calcular el total a pagar
  const getTotal = () => {
    if (!userData || selectedQuotas.length === 0) return "$0";
    
    let total = 0;
    
    selectedQuotas.forEach(index => {
      const quota = userData.quotas[index];
      // Convertir el string con formato de dinero a un número
      const amount = parseFloat(quota.totalAmount.replace(/[$,.]/g, ''));
      total += amount;
    });
    
    // Formatear el total como moneda chilena
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(total);
  };
  
  // Manejar la selección de cuotas
  const handleQuotaSelection = (index: number) => {
    setSelectedQuotas(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };
  
  // Manejar el botón de continuar
  const handleContinue = () => {
    if (selectedQuotas.length === 0) {
      alert("Por favor seleccione al menos una cuota para pagar.");
      return;
    }
    
    // Guardar la información seleccionada en sessionStorage
    if (userData) {
      const selectedQuotasInfo = selectedQuotas.map(index => userData.quotas[index]);
      const totalAmount = selectedQuotasInfo.reduce((sum, quota) => {
        const amount = parseFloat(quota.totalAmount.replace(/[$,.]/g, ''));
        return sum + amount;
      }, 0);
      
      // Registrar en la consola para depuración
      console.log("UserData:", userData);
      console.log("SelectedQuotasInfo:", selectedQuotasInfo);
      
      const paymentInfo = {
        clientName: userData.clientName,
        clientRut: userData.clientRut,
        paymentDate: new Date().toLocaleDateString('es-CL'),
        paymentTime: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        totalAmount: totalAmount,
        quotas: selectedQuotasInfo.map(quota => ({
          contractNumber: quota.contractNumber,
          licensePlate: quota.licensePlate,
          vehicleType: quota.vehicleType,
          totalAmount: quota.totalAmount,
          quotaNumber: quota.quotaNumber,
          dueDate: quota.dueDate || (quota.daysUntilDue === 0 ? 
                                    "Venció el 05/04/2025" : 
                                    `Vence en ${quota.daysUntilDue} ${quota.daysUntilDue === 1 ? 'día' : 'días'}`)
        })),
        operationCode: `FORUM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`
      };
      
      console.log("Información de pago generada:", paymentInfo);
      
      sessionStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));
    }
    
    // Ir a la siguiente etapa (simulación de procesamiento de pago)
    setIsLoading(true);
    
    // Simulamos un breve tiempo de procesamiento y luego redirigimos
    setTimeout(() => {
      setLocation('/payment-success');
    }, 1500);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <ForumLoader fullScreen={true} />
      </div>
    );
  }
  
  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-gray-600">Cargando información del cliente...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F1F1] overflow-x-hidden">
      <Header />
      
      <div className="flex-grow">
        <div className="max-w-5xl mx-auto pt-4 px-4">
          {/* Header con nombre y RUT */}
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
              <img src="/images/user.png" alt="Usuario" className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[#009ADE] font-medium">{userData.clientName}</p>
              <p className="text-gray-600 text-sm">{userData.clientRut}</p>
            </div>
          </div>
          
          {/* Progress steps */}
          <div className="mb-6">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 h-1 bg-gray-300 top-1/2 transform -translate-y-1/2 z-0"></div>
              <div className="flex flex-col items-center relative z-10">
                <div className="w-6 h-6 rounded-full bg-[#009ADE] flex items-center justify-center text-white text-sm mb-1">
                  ⚫
                </div>
                <div className="text-center text-xs text-gray-600 w-24">
                  Cuotas a pagar
                </div>
              </div>
              <div className="flex flex-col items-center relative z-10">
                <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm mb-1">
                  ⚫
                </div>
                <div className="text-center text-xs text-gray-600 w-24">
                  Método de pago
                </div>
              </div>
              <div className="flex flex-col items-center relative z-10">
                <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm mb-1">
                  ⚫
                </div>
                <div className="text-center text-xs text-gray-600 w-24">
                  Comprobante de pago
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Main content - Cuotas */}
            <div className="md:w-2/3">
              {/* Bloque de suscripción PAC/PAT si corresponde */}
              {userData.showPacPatSubscription && (
                <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                  <div className="flex">
                    <div className="w-1/3">
                      <img src="/images/card-pac-pat.png" alt="Tarjeta PAC/PAT" className="w-full" />
                    </div>
                    <div className="w-2/3 pl-6">
                      <h2 className="text-xl font-medium text-gray-700 mb-2">Suscripción automática a PAC o PAT</h2>
                      <p className="text-gray-600 text-sm mb-4">
                        Puedes suscribir el pago de tus cuotas de manera automática (PAC o PAT).
                        Este servicio es totalmente gratuito
                      </p>
                      <button className="bg-[#E74F32] text-white px-4 py-2 rounded">
                        Suscribir a PAC/PAT
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <h2 className="text-xl font-medium text-[#009ADE] mb-6">Cuotas a pagar</h2>
                
                {/* Mapeo de cuotas dinámicamente */}
                {userData.quotas.map((quota, index) => (
                  <div key={index} className={index < userData.quotas.length - 1 ? "border-b pb-6 mb-6" : ""}>
                    <div className="bg-[#009ADE] text-white p-4 rounded-t-lg flex justify-between items-center mb-4">
                      <div className="grid grid-cols-3 gap-6 w-full">
                        <div>
                          <div className="text-xs opacity-80">Contrato</div>
                          <div className="font-medium">{quota.contractNumber}</div>
                        </div>
                        <div>
                          <div className="text-xs opacity-80">Patente</div>
                          <div className="font-medium">{quota.licensePlate.replace(/-/g, '•')}</div>
                        </div>
                        <div>
                          <div className="text-xs opacity-80">Vehículo</div>
                          <div className="font-medium">{quota.vehicleType}</div>
                        </div>
                      </div>
                      
                      {quota.pacPatActive && (
                        <div className="flex items-center ml-4">
                          <div className="w-5 h-5 bg-white rounded-full mr-2 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#009ADE]"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                          <span className="whitespace-nowrap">PAC/PAT Activo</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <CustomCheckbox 
                        id={`quota-${index}`}
                        checked={selectedQuotas.includes(index)}
                        onChange={() => handleQuotaSelection(index)}
                      />
                      
                      <div className="grid grid-cols-4 gap-6 w-full">
                        <div>
                          <div className="text-xs text-gray-500">Cuota N°{quota.quotaNumber}</div>
                          <div className="text-sm">Vence en {quota.daysUntilDue} {quota.daysUntilDue === 1 ? 'día' : 'días'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Cuota</div>
                          <div className="font-medium">{quota.quotaAmount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Interés Mora</div>
                          <div className="font-medium">{quota.interestAmount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Total Cuota</div>
                          <div className="font-medium">{quota.totalAmount}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Mensaje de advertencia, si existe */}
                {userData.warningMessage && (
                  <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mt-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700 whitespace-pre-line">
                          {userData.warningMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sidebar - Resumen */}
            <div className="md:w-1/3">
              <div className="bg-[#01284E] text-white rounded-lg p-6 shadow-sm mb-6">
                <h2 className="text-xl font-medium mb-6">Resumen total de Pago</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span>Total Cuotas {selectedQuotas.length}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 text-blue-300"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </div>
                    <span className="font-medium">{selectedQuotas.length ? getTotal() : "$0"}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span>Total Interés Mora</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 text-blue-300"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </div>
                    <span className="font-medium">$0</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span>Total Gastos Cobranza</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 text-blue-300"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </div>
                    <span className="font-medium">$0</span>
                  </div>
                </div>
                
                <div className="border-t border-blue-800 my-4 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total a Pagar</span>
                    <span className="font-medium">{selectedQuotas.length ? getTotal() : "$0"}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleContinue}
                disabled={selectedQuotas.length === 0}
                className={`w-full py-3 rounded-md font-medium text-center ${selectedQuotas.length > 0 ? 'bg-[#0099CD] hover:bg-[#0089c7] text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'}`}
              >
                Continuar
              </button>
              
              <div className="mt-8 bg-white rounded-lg p-4 border border-blue-100">
                <div>
                  <img src="/images/sucursal-virtual-banner.png" alt="Sucursal Virtual" className="w-full h-auto rounded-lg object-cover mb-3" />
                  <h3 className="text-[#009ADE] font-medium text-center">En ella podrás seguir tu plan de pagos y conocer toda la información de tu crédito de manera online y 24/7</h3>
                  <p className="text-center text-sm mt-2">Conócela registrándote aquí.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}