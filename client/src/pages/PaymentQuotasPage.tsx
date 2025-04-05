import React, { useState, useEffect } from "react";
import { RouteComponentProps, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/use-websocket";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ForumLoader from "@/components/ForumLoader";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
}

interface PaymentQuotasProps extends RouteComponentProps {}

export default function PaymentQuotasPage(_props: PaymentQuotasProps) {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [clientName] = useState("CRISTIAN SERVANDO VALENZUELA BUSTOS");
  const [clientRut] = useState("17.546.765-3");
  const [selectedQuotas, setSelectedQuotas] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Datos de cuotas (simulados)
  const [quotas] = useState<QuotaInfo[]>([
    {
      contractNumber: "744530",
      licensePlate: "XX-XX-XX",
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
      licensePlate: "XX-XX-XX",
      vehicleType: "CHEVROLET XXXXXXXXX 2023",
      pacPatActive: true,
      quotaNumber: "2",
      quotaAmount: "$917.539",
      interestAmount: "$0",
      totalAmount: "$917.539",
      daysUntilDue: 1
    }
  ]);
  
  // Calcular el total a pagar
  const getTotal = () => {
    if (selectedQuotas.length === 0) return "$0";
    
    let total = 0;
    
    selectedQuotas.forEach(index => {
      const quota = quotas[index];
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
              <p className="text-[#009ADE] font-medium">{clientName}</p>
              <p className="text-gray-600 text-sm">{clientRut}</p>
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
              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <h2 className="text-xl font-medium text-[#009ADE] mb-6">Cuotas a pagar</h2>
                
                {/* Cuota 1 */}
                <div className="border-b pb-6 mb-6">
                  <div className="bg-[#009ADE] text-white p-4 rounded-t-lg flex justify-between items-center mb-4">
                    <div className="grid grid-cols-3 gap-6 w-full">
                      <div>
                        <div className="text-xs opacity-80">Contrato</div>
                        <div className="font-medium">{quotas[0].contractNumber}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-80">Patente</div>
                        <div className="font-medium">{quotas[0].licensePlate}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-80">Vehículo</div>
                        <div className="font-medium">{quotas[0].vehicleType}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center ml-4">
                      <div className="w-5 h-5 bg-white rounded-full mr-2 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#009ADE]"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="whitespace-nowrap">PAC/PAT Activo</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <CustomCheckbox 
                      id={`quota-0`}
                      checked={selectedQuotas.includes(0)}
                      onChange={() => handleQuotaSelection(0)}
                    />
                    
                    <div className="grid grid-cols-4 gap-6 w-full">
                      <div>
                        <div className="text-xs text-gray-500">Cuota N°6</div>
                        <div className="text-sm">Vence en 4 días</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Cuota</div>
                        <div className="font-medium">$1.358.270</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Interés Mora</div>
                        <div className="font-medium">$0</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Total Cuota</div>
                        <div className="font-medium">$1.358.270</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Cuota 2 */}
                <div>
                  <div className="bg-[#009ADE] text-white p-4 rounded-t-lg flex justify-between items-center mb-4">
                    <div className="grid grid-cols-3 gap-6 w-full">
                      <div>
                        <div className="text-xs opacity-80">Contrato</div>
                        <div className="font-medium">{quotas[1].contractNumber}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-80">Patente</div>
                        <div className="font-medium">{quotas[1].licensePlate}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-80">Vehículo</div>
                        <div className="font-medium">{quotas[1].vehicleType}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center ml-4">
                      <div className="w-5 h-5 bg-white rounded-full mr-2 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#009ADE]"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="whitespace-nowrap">PAC/PAT Activo</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <CustomCheckbox 
                      id={`quota-1`}
                      checked={selectedQuotas.includes(1)}
                      onChange={() => handleQuotaSelection(1)}
                    />
                    
                    <div className="grid grid-cols-4 gap-6 w-full">
                      <div>
                        <div className="text-xs text-gray-500">Cuota N°2</div>
                        <div className="text-sm">Vence en 1 día</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Cuota</div>
                        <div className="font-medium">$917.539</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Interés Mora</div>
                        <div className="font-medium">$0</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Total Cuota</div>
                        <div className="font-medium">$917.539</div>
                      </div>
                    </div>
                  </div>
                </div>
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