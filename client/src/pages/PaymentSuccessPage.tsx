import React, { useEffect, useState } from "react";
import { RouteComponentProps, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface PaymentSuccessPageProps extends RouteComponentProps {}

// Interfaz para la información de pago
interface PaymentInfo {
  clientName: string;
  clientRut: string;
  paymentDate: string;
  paymentTime: string;
  totalAmount: number;
  operationCode: string;
  quotas: Array<{
    contractNumber: string;
    licensePlate: string;
    vehicleType: string;
    totalAmount: string;
    quotaNumber: string;
  }>;
}

export default function PaymentSuccessPage(_props: PaymentSuccessPageProps) {
  const [_location, setLocation] = useLocation();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  
  useEffect(() => {
    // Recuperar la información de pago desde sessionStorage
    const storedPaymentInfo = sessionStorage.getItem('paymentInfo');
    
    if (storedPaymentInfo) {
      try {
        const parsedInfo = JSON.parse(storedPaymentInfo) as PaymentInfo;
        setPaymentInfo(parsedInfo);
        console.log("Información de pago recuperada:", parsedInfo);
      } catch (error) {
        console.error("Error al recuperar información de pago:", error);
      }
    } else {
      // Si no hay información, podríamos usar datos predeterminados o redirigir
      console.warn("No se encontró información de pago en sessionStorage");
    }
  }, []);
  
  // Formatear el monto como moneda chilena
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Si no hay información de pago, usar valores predeterminados
  const clientName = paymentInfo?.clientName || "CRISTIAN SERVANDO VALENZUELA BUSTOS";
  const clientRut = paymentInfo?.clientRut || "17.546.765-3";
  const paymentDate = paymentInfo?.paymentDate || "01/04/2025";
  const paymentTime = paymentInfo?.paymentTime || "10:15 AM";
  const operationCode = paymentInfo?.operationCode || "FORUM-2025040101";
  const totalAmount = paymentInfo ? formatCurrency(paymentInfo.totalAmount) : "$2.275.809";
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <div className="max-w-5xl mx-auto pt-4 px-4 flex-grow">
        {/* Header con nombre y RUT */}
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
            <img src="/images/user.png" alt="Usuario" className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[#009ADE] font-medium">{clientName}</p>
            <p className="text-gray-600 text-sm">{clientRut}</p>
          </div>
        </div>
        
        {/* Progress steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 h-1 bg-gray-300 top-1/2 transform -translate-y-1/2 z-0"></div>
            <div className="flex flex-col items-center relative z-10">
              <div className="w-6 h-6 rounded-full bg-[#009ADE] flex items-center justify-center text-white text-sm mb-1">
                ✓
              </div>
              <div className="text-center text-xs text-gray-600 w-24">
                Cuotas a pagar
              </div>
            </div>
            <div className="flex flex-col items-center relative z-10">
              <div className="w-6 h-6 rounded-full bg-[#009ADE] flex items-center justify-center text-white text-sm mb-1">
                ✓
              </div>
              <div className="text-center text-xs text-gray-600 w-24">
                Método de pago
              </div>
            </div>
            <div className="flex flex-col items-center relative z-10">
              <div className="w-6 h-6 rounded-full bg-[#009ADE] flex items-center justify-center text-white text-sm mb-1">
                ✓
              </div>
              <div className="text-center text-xs text-gray-600 w-24">
                Comprobante de pago
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main content - Comprobante */}
          <div className="md:w-2/3">
            <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
              <div className="wrap-info p-4 border rounded-lg mb-6" style={{ borderRadius: "0 0 80px 0", borderColor: "#BABABA" }}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-medium text-[#009ADE]">¡Pago realizado con éxito!</h2>
                  <img src="/images/time.png" alt="Tiempo" className="w-6 h-6" />
                </div>
                
                <div className="space-y-4">
                  <p className="text-justify customText">
                    Te informamos que tu pago de crédito automotriz ha sido realizado con éxito.
                  </p>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="font-medium text-gray-700 mr-2">Detalles del pago:</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium">{paymentDate}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hora:</span>
                        <span className="font-medium">{paymentTime}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Método de pago:</span>
                        <span className="font-medium">WebPay</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Código de operación:</span>
                        <span className="font-medium">{operationCode}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total pagado:</span>
                        <span className="font-medium text-[#009ADE]">{totalAmount}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contratos pagados */}
                  {paymentInfo && paymentInfo.quotas.length > 0 && (
                    <div className="mt-4">
                      <span className="font-medium text-gray-700">Contratos pagados:</span>
                      <div className="mt-2 space-y-2">
                        {paymentInfo.quotas.map((quota, index) => (
                          <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                            <div className="flex justify-between">
                              <span>Contrato:</span>
                              <span className="font-medium">{quota.contractNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cuota:</span>
                              <span className="font-medium">N°{quota.quotaNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Vehículo:</span>
                              <span className="font-medium">{quota.vehicleType}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-justify customText">
                    Recuerda que puedes solicitar tu comprobante de pago a través de nuestro sitio web o acercándote a cualquiera de nuestras sucursales.
                  </p>
                  
                  <div className="flex justify-center mt-4">
                    <Button 
                      className="btn-button"
                      onClick={() => setLocation('/')}
                      style={{ backgroundColor: "#dd4b26", width: "63%" }}
                    >
                      Volver al inicio
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">
                  <img src="/images/direccion.png" alt="Dirección" className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Sucursales</h3>
                  <p className="text-sm text-gray-600">Visita nuestras sucursales para más información</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar - Promoción */}
          <div className="md:w-1/3">
            <div className="mt-8 bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex flex-col">
                <div className="flex-shrink-0 mb-4">
                  <img src="/images/sucursal-virtual-banner.png" alt="Ejecutivo" className="w-full h-auto rounded-lg object-cover" />
                </div>
                <div>
                  <h3 className="text-[#009ADE] font-medium">En ella podrás seguir tu plan de pagos y conocer toda la información de tu crédito de manera online y 24/7</h3>
                  <p className="text-center text-sm mt-2">Conócela registrándote aquí.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">
                  <img src="/images/call-center.png" alt="Centro de Llamadas" className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Centro de Atención al Cliente</h3>
                  <p className="text-sm text-gray-600">¿Necesitas ayuda? Contáctanos al 600 800 9000</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <img src="/images/forum.png" alt="Forum" className="h-10 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">© 2025 Forum Servicios Financieros</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}