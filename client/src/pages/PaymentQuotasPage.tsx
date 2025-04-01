import React, { useState, useEffect } from "react";
import { RouteComponentProps, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useWebSocket } from "@/hooks/use-websocket";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ForumLoader from "@/components/ForumLoader";

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
  const [clientName, setClientName] = useState("CRISTIAN SERVANDO VALENZUELA BUSTOS");
  const [clientRut, setClientRut] = useState("17.546.765-3");
  const [selectedQuotas, setSelectedQuotas] = useState<number[]>([]);
  
  // Datos de cuotas (simulados)
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
  
  // Calcular el total a pagar
  const getTotal = () => {
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
  
  // Manejar el pago
  const handlePay = () => {
    if (selectedQuotas.length === 0) {
      alert("Por favor seleccione al menos una cuota para pagar.");
      return;
    }
    
    setIsLoading(true);
    
    // Simular un proceso de pago
    setTimeout(() => {
      // Redirigir a la página de éxito o a la página de opciones de pago
      setLocation('/');
    }, 2000);
  };
  
  // Determinar el color del badge según los días restantes
  const getDueDaysColor = (days: number): "secondary" | "default" | "destructive" | "outline" => {
    if (days <= 0) return 'destructive';
    if (days <= 3) return 'secondary';
    return 'outline';
  };
  
  const formatDaysText = (days: number) => {
    if (days <= 0) return 'Vencida';
    if (days === 1) return '1 día';
    return `${days} días`;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <ForumLoader fullScreen={true} />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <header className="bg-white p-6 rounded-lg shadow mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">Cuotas Pendientes</h1>
          <div className="flex flex-col sm:flex-row sm:justify-between">
            <div>
              <p className="font-medium">{clientName}</p>
              <p className="text-sm text-gray-600">RUT: {clientRut}</p>
            </div>
            {selectedQuotas.length > 0 && (
              <div className="mt-4 sm:mt-0 text-right">
                <p className="text-sm text-gray-600">Total seleccionado:</p>
                <p className="font-bold text-primary text-xl">{getTotal()}</p>
              </div>
            )}
          </div>
        </header>
        
        <div className="space-y-6">
          {quotas.map((quota, index) => (
            <Card key={index} className="p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16">
                <div className="absolute transform rotate-45 bg-blue-100 text-primary font-medium py-1 text-xs text-center w-24 top-4 right-[-24px]">
                  {quota.pacPatActive ? 'PAC/PAT' : ''}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">N° de Contrato</p>
                  <p className="font-medium">{quota.contractNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Patente</p>
                  <p className="font-medium">{quota.licensePlate}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-xs text-gray-500">Vehículo</p>
                <p className="font-medium">{quota.vehicleType}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">N° Cuota</p>
                  <p className="font-medium">{quota.quotaNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Monto Cuota</p>
                  <p className="font-medium">{quota.quotaAmount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Interés por Mora</p>
                  <p className="font-medium">{quota.interestAmount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total a Pagar</p>
                  <p className="font-medium text-primary">{quota.totalAmount}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`quota-${index}`}
                    checked={selectedQuotas.includes(index)}
                    onCheckedChange={() => handleQuotaSelection(index)}
                  />
                  <label 
                    htmlFor={`quota-${index}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    Seleccionar para pago
                  </label>
                </div>
                
                <Badge variant={getDueDaysColor(quota.daysUntilDue)}>
                  {formatDaysText(quota.daysUntilDue)}
                </Badge>
              </div>
            </Card>
          ))}
          
          <div className="flex justify-end mt-6">
            <Button 
              disabled={selectedQuotas.length === 0}
              onClick={handlePay}
              className="w-full sm:w-auto"
            >
              Pagar {selectedQuotas.length > 0 ? getTotal() : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}