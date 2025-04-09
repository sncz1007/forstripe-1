import React, { useEffect, useState } from "react";
import { RouteComponentProps, useLocation } from "wouter";
import ForumLoader from "@/components/ForumLoader";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
  const [error, setError] = useState<string | null>(null);
  
  // Al montar el componente, iniciamos un temporizador para la redirección
  useEffect(() => {
    console.log("PaymentBridge: Iniciando simulación de procesamiento de pago");
    
    try {
      // Recuperamos los datos almacenados en sessionStorage
      const paymentInfoStr = sessionStorage.getItem('paymentInfo');
      
      if (!paymentInfoStr) {
        // Mostrar el error pero continuar con el proceso
        console.warn("PaymentBridge: No se encontró información de pago en sessionStorage");
        setError("No se encontraron datos de pago. Continuando con datos de demostración.");
        
        // Crear datos de ejemplo básicos para asegurar que la página de éxito funcione
        const demoPaymentInfo = {
          clientName: "Usuario Demo",
          clientRut: "12.345.678-5",
          paymentDate: new Date().toLocaleDateString('es-CL'),
          paymentTime: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          totalAmount: 1359000,
          operationCode: `FORUM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
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
        
        // Guardamos los datos generados
        sessionStorage.setItem('paymentInfo', JSON.stringify(demoPaymentInfo));
        
        if (!sessionStorage.getItem('preferenceId')) {
          sessionStorage.setItem('preferenceId', `TEST-PREF-${Date.now()}`);
        }
      }
      
      // Iniciar la cuenta regresiva para la redirección
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Agregar parámetros de simulación y guardar información del pago
            const now = new Date();
            const paymentInfo = {
              paymentId: `TEST-PAYMENT-${Date.now()}`,
              paymentDate: now.toLocaleDateString('es-CL'),
              paymentTime: now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
              status: 'approved'
            };
            
            // Guardar la información del pago en sessionStorage
            sessionStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));
            
            // Crear URL con parámetros completos
            const redirectUrl = '/payment-success?status=approved&payment_id=' + paymentInfo.paymentId;
            console.log("Redirigiendo a:", redirectUrl);
            
            // Usamos setLocation para navegación interna
            setLocation(redirectUrl);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
      
    } catch (err) {
      console.error("Error en PaymentBridge:", err);
      setError("Ocurrió un error al procesar el pago. Continuando con el flujo básico.");
      
      // Aún con error, seguimos con la redirección
      setTimeout(() => {
        setLocation('/payment-success?status=approved&error=true');
      }, 3000);
    }
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-grow flex flex-col items-center justify-center p-6">
        <ForumLoader fullScreen={false} />
        
        <div className="text-center mt-8">
          <h2 className="text-2xl font-semibold text-[#009ADE] mb-2">
            Procesando tu pago
          </h2>
          
          <p className="text-gray-600 text-lg mb-1">
            Estamos procesando tu solicitud...
          </p>
          
          <p className="text-gray-500">
            Serás redirigido en {countdown} segundos
          </p>
          
          {error && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 p-4 rounded-lg max-w-lg mx-auto">
              <p className="text-yellow-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}