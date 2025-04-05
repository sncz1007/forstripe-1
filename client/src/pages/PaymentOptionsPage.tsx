import React from "react";
import { RouteComponentProps, useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

interface PaymentOptionsProps extends RouteComponentProps<{ requestId: string }> {}

export default function PaymentOptionsPage({ params }: PaymentOptionsProps) {
  const requestId = params.requestId;
  const [, setLocation] = useLocation();

  const handlePayment = (provider: string) => {
    console.log(`Procesando pago con ${provider}, ID de solicitud: ${requestId}`);
    // Guardar el proveedor seleccionado en sessionStorage para referencia futura
    sessionStorage.setItem('paymentProvider', provider);
    // Redirigir a la página de carga
    setLocation(`/payment/${requestId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F1F1] overflow-x-hidden">
      <Header />
      
      <div className="flex justify-center items-start pt-8 pb-8 flex-grow">
        <div style={{ width: '1100px' }} className="mx-auto">
          <div className="flex flex-col bg-white rounded shadow-sm overflow-hidden py-12">
            <div className="text-center mb-10">
              <h2 className="text-[28px] text-[#00AEEF] font-medium">
                Paga tu deuda en Pago Express
              </h2>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between px-20">
              {/* Opción Forum */}
              <div className="flex flex-col items-center">
                <div className="mb-4">
                  <img src="/images/forum.png" alt="Forum" className="h-12" />
                </div>
                <Button 
                  onClick={() => handlePayment('forum')}
                  className="bg-[#00AEEF] hover:bg-[#0096cc] text-white px-8 py-2 rounded"
                >
                  Pagar tu deuda Forum
                </Button>
              </div>
              
              {/* Opción Salvum */}
              <div className="flex flex-col items-center">
                <div className="mb-4">
                  <img src="/images/salvum-logo.png" alt="Salvum" className="h-12" />
                </div>
                <Button 
                  onClick={() => handlePayment('salvum')}
                  className="bg-[#00AEEF] hover:bg-[#0096cc] text-white px-8 py-2 rounded"
                >
                  Pagar tu deuda Salvum
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}