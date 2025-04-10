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
  const extractUserDataFromResponse = (requestData: any): UserInfo | null => {
    const responseText = requestData.response || "";
    try {
      console.log("Analizando respuesta:", responseText);
      
      if (!responseText) return null;
      
      // Separar el texto en líneas para facilitar el procesamiento
      const lines = responseText.split(/\r?\n/).map((line: string) => line.trim()).filter((line: string) => line !== "");
      console.log("Líneas totales:", lines.length);
      
      if (lines.length < 2) {
        console.log("No hay suficientes líneas para procesar en la respuesta");
        return null;
      }
      
      // Inicializar datos del cliente
      // Primera línea es siempre el nombre
      let clientName = lines[0].trim();
      // Segunda línea es siempre el RUT - preservar exactamente como está en el input
      let clientRut = lines[1].trim();
      
      // Actualizar nombre y RUT desde el servidor si están disponibles
      // Solo si no se puede extraer del texto de respuesta
      if (!clientName && requestData.clientName) clientName = requestData.clientName;
      if (!clientRut && requestData.rut) clientRut = requestData.rut;
      
      console.log("Datos del cliente extraídos:", { clientName, clientRut });
      
      // Guardar en sessionStorage para uso posterior
      sessionStorage.setItem('clientName', clientName);
      sessionStorage.setItem('rutValue', clientRut);
      
      // Encontrar todas las cuotas en el texto
      const quotas: QuotaInfo[] = [];
      
      // Buscar índices de inicio de cada cuota (líneas que comienzan con "Cuota N°")
      const quotaStartIndices: number[] = [];
      lines.forEach((line: string, index: number) => {
        if (line.match(/^Cuota\s+N[°o]?\s*\d+$/)) {
          quotaStartIndices.push(index);
        }
      });
      
      console.log("Índices de inicio de cuotas:", quotaStartIndices);
      
      // Si no hay cuotas identificadas, buscamos por patrones alternativos
      if (quotaStartIndices.length === 0) {
        const altIndices: number[] = [];
        lines.forEach((line: string, index: number) => {
          if (line.includes("Cuota N°")) {
            altIndices.push(index);
          }
        });
        if (altIndices.length > 0) {
          console.log("Índices alternativos de cuotas:", altIndices);
          quotaStartIndices.push(...altIndices);
        }
      }
      
      // Procesar cada cuota encontrada
      quotaStartIndices.forEach((startIndex: number, idx: number) => {
        // Determinar el rango de líneas para esta cuota
        const endIndex = idx < quotaStartIndices.length - 1 
          ? quotaStartIndices[idx + 1] 
          : lines.length;
          
        const quotaLines = lines.slice(startIndex, endIndex);
        console.log(`Procesando cuota ${idx + 1}:`, quotaLines);
        
        let quotaNumber = "";
        let contractNumber = "000000";
        let licensePlate = "XX-XX-XX";
        let vehicleType = "AUTOMÓVIL";
        let pacPatActive = false;
        let daysUntilDue = 10;
        let dueDate: string | undefined;
        let quotaAmount = "$0";
        let interestAmount = "$0";
        let totalAmount = "$0";
        
        // Extraer número de cuota de la línea de inicio
        const quotaMatch = lines[startIndex].match(/Cuota\s+N[°o]?\s*(\d+)/);
        if (quotaMatch) {
          quotaNumber = quotaMatch[1];
          console.log(`Número de cuota encontrado: ${quotaNumber}`);
        }
        
        // Encontrar la sección de contrato dentro de esta cuota o en el texto completo
        let contractIndex = -1;
        
        // Primero buscar en las líneas de esta cuota
        for (let i = 0; i < quotaLines.length; i++) {
          if (quotaLines[i] === "Contrato") {
            contractIndex = i;
            break;
          }
        }
        
        // Si no se encuentra dentro de esta cuota, buscar en todo el texto
        if (contractIndex === -1) {
          // Buscar contratos en todas las líneas
          for (let i = 0; i < lines.length; i++) {
            if (lines[i] === "Contrato" && i + 1 < lines.length) {
              // Encontrar el contrato más cercano antes de la cuota actual
              if (i < startIndex) {
                contractNumber = lines[i + 1].trim();
                console.log(`Contrato encontrado en líneas globales: ${contractNumber}`);
                break;
              }
            }
          }
        } else if (contractIndex !== -1 && contractIndex + 1 < quotaLines.length) {
          // El número de contrato está en la línea siguiente dentro de la cuota
          contractNumber = quotaLines[contractIndex + 1].trim();
          console.log(`Contrato encontrado dentro de la cuota: ${contractNumber}`);
        }
        
        // Verificar si PAC/PAT está activo
        for (let i = 0; i < quotaLines.length; i++) {
          if (quotaLines[i].includes("PAC/PAT Activo")) {
            pacPatActive = true;
            console.log("PAC/PAT activo encontrado");
            break;
          }
        }
        
        // Buscar líneas con información específica
        let vencimientoIndex = -1;
        let cuotaIndex = -1;
        let interesIndex = -1;
        let totalIndex = -1;
        
        for (let i = 0; i < quotaLines.length; i++) {
          const line = quotaLines[i].toLowerCase();
          
          // Buscar vencimiento
          if (line.includes("vence") || line.includes("venció")) {
            vencimientoIndex = i;
          }
          // Buscar líneas de montos
          else if (line === "cuota") {
            cuotaIndex = i;
          }
          else if (line === "interés mora") {
            interesIndex = i;
          }
          else if (line === "total cuota") {
            totalIndex = i;
          }
        }
        
        // Extraer la fecha de vencimiento
        if (vencimientoIndex !== -1) {
          const vencimientoLine = quotaLines[vencimientoIndex];
          dueDate = vencimientoLine;
          
          if (vencimientoLine.includes("Vence en")) {
            const daysMatch = vencimientoLine.match(/Vence\s+en\s+(\d+)\s+días?/);
            if (daysMatch) {
              daysUntilDue = parseInt(daysMatch[1]);
            }
          } else if (vencimientoLine.includes("Venció")) {
            // Si la cuota venció, mostrar el texto exacto y no "Vence en 0 días"
            daysUntilDue = 0;
          }
          
          console.log(`Vencimiento encontrado: ${dueDate} (días: ${daysUntilDue})`);
        }
        
        // Extraer los montos - usar directamente los valores exactos encontrados en el texto
        if (cuotaIndex !== -1 && cuotaIndex + 1 < quotaLines.length) {
          // Tomar el valor exactamente como aparece, sin procesar
          quotaAmount = quotaLines[cuotaIndex + 1].trim();
          console.log(`Monto cuota (exacto): ${quotaAmount}`);
        }
        
        if (interesIndex !== -1 && interesIndex + 1 < quotaLines.length) {
          // Tomar el valor exactamente como aparece, sin procesar
          interestAmount = quotaLines[interesIndex + 1].trim();
          console.log(`Interés mora (exacto): ${interestAmount}`);
        }
        
        if (totalIndex !== -1 && totalIndex + 1 < quotaLines.length) {
          // Tomar el valor exactamente como aparece, sin procesar
          totalAmount = quotaLines[totalIndex + 1].trim();
          console.log(`Total cuota (exacto): ${totalAmount}`);
        }
        
        // Buscar manualmente valores monetarios si los índices no se encontraron
        if (!quotaAmount.includes('$') || !totalAmount.includes('$')) {
          for (let i = 0; i < quotaLines.length; i++) {
            const line = quotaLines[i].trim();
            if (line.startsWith('$') && !quotaAmount.includes('$')) {
              quotaAmount = line;
              console.log(`Monto cuota detectado manualmente: ${quotaAmount}`);
            } else if (line.startsWith('$') && quotaAmount.includes('$') && !interestAmount.includes('$')) {
              interestAmount = line;
              console.log(`Interés mora detectado manualmente: ${interestAmount}`);
            } else if (line.startsWith('$') && quotaAmount.includes('$') && interestAmount.includes('$') && !totalAmount.includes('$')) {
              totalAmount = line;
              console.log(`Total cuota detectado manualmente: ${totalAmount}`);
            }
          }
        }
        
        // Crear el objeto de cuota con la información extraída
        quotas.push({
          contractNumber,
          licensePlate,
          vehicleType,
          pacPatActive,
          quotaNumber,
          quotaAmount,
          interestAmount,
          totalAmount,
          daysUntilDue,
          dueDate
        });
      });
      
      console.log("Cuotas extraídas:", quotas);
      
      // Si no se encontraron cuotas pero tenemos datos desde el servidor, usarlos
      if (quotas.length === 0 && requestData) {
        if (requestData.contractNumber || requestData.amount) {
          console.log("Usando datos del servidor para crear cuota");
          
          quotas.push({
            contractNumber: requestData.contractNumber || "000000",
            licensePlate: requestData.licensePlate || "XX-XX-XX",
            vehicleType: requestData.vehicleType || "AUTOMÓVIL",
            pacPatActive: false,
            quotaNumber: requestData.quotaNumber || "1",
            quotaAmount: requestData.amount || "$0",
            interestAmount: requestData.interestAmount || "$0",
            totalAmount: requestData.totalAmount || "$0",
            daysUntilDue: 10
          });
        }
      }
      
      // Si después de todo aún no hay cuotas, crear una por defecto
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
      
      // Determinar si debe mostrar suscripción PAC/PAT
      const showPacPat = responseText.includes("PAC/PAT Activo") || 
                         responseText.includes("PAC o PAT") ||
                         responseText.includes("suscribir el pago");
      
      // Extraer información de advertencia y mensajes adicionales
      let warningMessage: string | undefined = undefined;
      
      // Buscar mensajes especiales o notas adicionales
      const specialMessages: string[] = [];
      
      lines.forEach((line: string) => {
        if (line.includes("Mensaje especial:") || 
            line.includes("Otro mensaje:") || 
            line.includes("Nota:")) {
          specialMessages.push(line);
        }
      });
      
      if (responseText.includes("El pago vía PAC/PAT puede tardar")) {
        const warningRegex = /(El pago vía PAC\/PAT puede tardar[^]*?\*\*[^]*?señalado)/;
        const warningMatch = responseText.match(warningRegex);
        const pacPatWarning = warningMatch ? warningMatch[1] : undefined;
        
        if (pacPatWarning) {
          if (specialMessages.length > 0) {
            // Combinar advertencia PAC/PAT con mensajes especiales
            warningMessage = `${pacPatWarning}\n\n${specialMessages.join("\n")}`;
          } else {
            warningMessage = pacPatWarning;
          }
        }
      } else if (specialMessages.length > 0) {
        // Si no hay advertencia PAC/PAT pero hay mensajes especiales
        warningMessage = specialMessages.join("\n");
      }
      
      console.log("Mensaje(s) de advertencia extraído(s):", warningMessage);
      
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
        
        // Pasamos los datos completos del API, no solo la respuesta
        console.log("Datos completos para extraer:", data);
        
        if (data.response) {
          console.log("Texto de respuesta encontrado:", data.response);
          // La solicitud fue aprobada y tiene una respuesta
          const extractedData = extractUserDataFromResponse(data);
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
              quotaAmount: "$1.359.000",
              interestAmount: "$0",
              totalAmount: "$1.359.000",
              daysUntilDue: 0
            },
            {
              contractNumber: "1210457",
              licensePlate: "XX-XX-XX",
              vehicleType: "CHEVROLET XXXXXXXXX 2023",
              pacPatActive: true,
              quotaNumber: "3",
              quotaAmount: "$917.000",
              interestAmount: "$0",
              totalAmount: "$917.000",
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
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const wsClient = new WebSocket(wsUrl);
      
      wsClient.onopen = () => {
        wsClient.send(JSON.stringify({ type: 'register', requestId }));
      };
      
      wsClient.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'request_status' && data.request.status === 'processing' && data.request) {
            console.log("Recibido mensaje WebSocket con datos:", data.request);
            const extractedData = extractUserDataFromResponse(data.request);
            if (extractedData) {
              console.log("Datos extraídos de WebSocket:", extractedData);
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
      // Convertir el string con formato de dinero a un número (formato chileno con punto como separador de miles)
      const amount = parseFloat(quota.totalAmount.replace(/[$.,]/g, '').replace(/,/g, '.'));
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
  
  // Calcular el total de interés mora
  const getTotalInteres = () => {
    if (!userData || selectedQuotas.length === 0) return "$0";
    
    let total = 0;
    
    selectedQuotas.forEach(index => {
      const quota = userData.quotas[index];
      // Convertir el string con formato de dinero a un número (formato chileno)
      const amount = parseFloat(quota.interestAmount.replace(/[$.,]/g, '').replace(/,/g, '.'));
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
  const handleContinue = async () => {
    console.log("🔍 Iniciando proceso de pago...");
    
    if (selectedQuotas.length === 0) {
      alert("Por favor seleccione al menos una cuota para pagar.");
      return;
    }
    
    // Verificar que userData existe
    if (!userData) {
      alert("Error: No se pudo cargar la información del cliente. Por favor, recargue la página.");
      return;
    }
    
    // Mostrar loading spinner
    setIsLoading(true);
    
    try {
      // Recolectar información de las cuotas seleccionadas
      const selectedQuotasInfo = selectedQuotas.map(index => userData.quotas[index]);
      
      // Crear el array de cuotas para enviar a Mercado Pago
      const cuotasParaMercadoPago = selectedQuotasInfo.map(quota => {
        // Extraer solo los números del string de monto (eliminar puntos, símbolos, etc.)
        console.log(`💲 Procesando monto de cuota: ${quota.totalAmount}`);
        const cleanedAmount = quota.totalAmount.replace(/[^0-9]/g, '');
        console.log(`💲 Monto limpio (sin puntos/símbolos): ${cleanedAmount}`);
        
        // Convertimos a número entero para el backend
        const totalAmount = parseInt(cleanedAmount, 10);
        console.log(`💲 Monto total como entero: ${totalAmount}`);
        
        // El unit_price debe estar en la moneda base (pesos completos, no centavos)
        // NO dividimos por 100 porque ya está en pesos chilenos
        const unitPrice = totalAmount;
        console.log(`💲 Precio unitario final para MP: ${unitPrice}`);
        
        const cuotaObj = {
          title: `Cuota N°${quota.quotaNumber}`,
          description: `Contrato ${quota.contractNumber}`,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: 'CLP'  // Pesos chilenos
        };
        
        console.log(`📦 Objeto de cuota procesado:`, cuotaObj);
        return cuotaObj;
      });
      
      console.log("Cuotas preparadas para Mercado Pago:", cuotasParaMercadoPago);
      
      // Llamar al endpoint para generar el enlace de pago
      const response = await fetch('/generar-enlace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cuotas: cuotasParaMercadoPago })
      });
      
      const data = await response.json();
      console.log("Respuesta del servidor:", data);
      
      if (data.paymentLink) {
        console.log("Redirigiendo al enlace de pago:", data.paymentLink);
        // Guardamos el ID de preferencia para referencia futura
        if (data.preferenceId) {
          sessionStorage.setItem('preferenceId', data.preferenceId);
        }
        
        // Guardar información del cliente para mostrarla en la página de éxito
        sessionStorage.setItem('clientName', userData.clientName);
        sessionStorage.setItem('clientRut', userData.clientRut);
        
        // Guardar cuotas seleccionadas para mostrarlas en la página de éxito
        sessionStorage.setItem('selectedQuotas', JSON.stringify(selectedQuotasInfo));
        
        // Redirigir al enlace de pago con tiempo para asegurar que todo se guarde
        setTimeout(() => {
          // Si estamos utilizando Mercado Pago (no es fallback), siempre redirigir a URL externa
          if (!data.isFallback && data.paymentLink.startsWith('http')) {
            console.log("🔄 Redirigiendo a Mercado Pago (URL externa):", data.paymentLink);
            // URL externa de Mercado Pago - usar window.location.replace para redirigir correctamente
            window.location.replace(data.paymentLink);
          } 
          // Si es fallback o una URL interna, usar wouter para navegar
          else {
            try {
              // Obtenemos la ruta relativa si es una URL completa interna
              const path = data.paymentLink.includes(window.location.host) 
                ? new URL(data.paymentLink).pathname
                : data.paymentLink;
                
              console.log("🔄 Redirigiendo a ruta interna (fallback):", path);
              setLocation(path);
            } catch (error) {
              console.error("Error al procesar URL:", error);
              // En caso de error, redirigir a success directamente
              setLocation('/payment-success');
            }
          }
        }, 200);
      } else {
        throw new Error("No se recibió un enlace de pago válido");
      }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      alert("Hubo un problema al procesar su solicitud. Por favor, intente nuevamente.");
      setIsLoading(false);
    }
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
                          <span className="whitespace-nowrap font-medium">PAC/PAT Activo</span>
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
                          <div className="text-sm">{quota.dueDate || `Vence en ${quota.daysUntilDue} ${quota.daysUntilDue === 1 ? 'día' : 'días'}`}</div>
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
                    <span className="font-medium">{selectedQuotas.length ? getTotalInteres() : "$0"}</span>
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