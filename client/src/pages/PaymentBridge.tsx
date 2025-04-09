import React, { useEffect, useState } from "react";
import { RouteComponentProps, useLocation } from "wouter";
import ForumLoader from "@/components/ForumLoader";

interface PaymentBridgeProps extends RouteComponentProps {
  simulation?: boolean;
}

/**
 * Este componente actúa como un puente o simulador de pago
 * Simplemente muestra una animación de carga y luego redirecciona
 * a la página de pago exitoso después de un breve retraso.
 */
export default function PaymentBridge(props: PaymentBridgeProps) {
  const [_location, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(3);
  
  // Al montar el componente, iniciamos un temporizador para la redirección
  useEffect(() => {
    console.log("PaymentBridge: Iniciando simulación de procesamiento de pago");
    
    // Recuperamos los datos almacenados en sessionStorage si existen
    const paymentInfo = sessionStorage.getItem('paymentInfo');
    
    if (!paymentInfo) {
      console.warn("PaymentBridge: No se encontró información de pago en sessionStorage");
      // Generar datos de ejemplo para casos donde no haya información de pago
      const demoPaymentInfo = {
        clientName: "Usuario Demo",
        clientRut: "12.345.678-5",
        paymentDate: new Date().toLocaleDateString('es-CL'),
        paymentTime: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        totalAmount: 1359000,
        operationCode: `OP-${Date.now().toString().substring(7)}`,
        quotas: [
          {
            contractNumber: "CR-123456",
            licensePlate: "WXYZ-78",
            vehicleType: "Sedan Honda",
            totalAmount: "$1.359.000",
            quotaNumber: "3",
            dueDate: "Vence en 5 días"
          }
        ]
      };
      
      // Guardar los datos de demo en el sessionStorage
      sessionStorage.setItem('paymentInfo', JSON.stringify(demoPaymentInfo));
      sessionStorage.setItem('preferenceId', `TEST-PREF-${Date.now()}`);
    }
    
    // Iniciamos la cuenta regresiva
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Al llegar a cero, redirigimos a la página de éxito
          setLocation('/payment-success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Limpieza
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <ForumLoader fullScreen={true} />
      <p className="mt-8 text-gray-600 text-lg">Procesando tu pago...</p>
      <p className="mt-2 text-gray-500">Serás redirigido en {countdown} segundos</p>
    </div>
  );
}