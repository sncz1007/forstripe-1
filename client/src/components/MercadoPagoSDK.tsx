import { useEffect, useState } from 'react';

export async function createPreference(paymentData: any) {
  console.log('💲 Creando checkout de pago con Billpocket');
  
  try {
    const { requestId, selectedQuotaIndices } = paymentData;
    
    if (!requestId) {
      throw new Error('requestId es requerido para crear el pago');
    }
    
    if (!selectedQuotaIndices || !Array.isArray(selectedQuotaIndices) || selectedQuotaIndices.length === 0) {
      throw new Error('selectedQuotaIndices es requerido para crear el pago');
    }
    
    const response = await fetch('/generar-enlace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        requestId: requestId,
        selectedQuotaIndices: selectedQuotaIndices 
      })
    });
    
    const data = await response.json();
    console.log('✅ Respuesta del servidor:', data);
    
    if (data.success) {
      return {
        success: true,
        amount: data.amount,
        checkoutUrl: data.checkoutUrl,
        checkoutId: data.checkoutId,
        data: data
      };
    } else {
      return {
        success: false,
        error: data.error || 'Error al crear el checkout'
      };
    }
  } catch (error) {
    console.error('❌ Error creando checkout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export function useMercadoPago() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    setIsLoading(false);
  }, []);
  
  return { isLoading, error };
}
