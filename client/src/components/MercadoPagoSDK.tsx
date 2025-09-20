import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

/**
 * Esta función crea un Payment Intent usando Stripe a través del endpoint /generar-enlace
 */
export async function createPreference(paymentData: any) {
  console.log('💲 Creando Payment Intent con Stripe a través de /generar-enlace');
  
  try {
    const { requestId, selectedQuotaIndices } = paymentData;
    
    if (!requestId) {
      throw new Error('requestId es requerido para crear el Payment Intent');
    }
    
    if (!selectedQuotaIndices || !Array.isArray(selectedQuotaIndices) || selectedQuotaIndices.length === 0) {
      throw new Error('selectedQuotaIndices es requerido para crear el Payment Intent');
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
    console.log('✅ Payment Intent creado:', data);
    
    if (data.success) {
      return {
        success: true,
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        amount: data.amount,
        data: data
      };
    } else {
      return {
        success: false,
        error: data.error || 'Error al crear Payment Intent'
      };
    }
  } catch (error) {
    console.error('❌ Error creando Payment Intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Hook para usar Stripe en componentes React
 */
export function useMercadoPago() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    
    script.onload = () => {
      try {
        if (typeof window.Stripe === 'undefined') {
          throw new Error('El SDK de Stripe no se cargó correctamente');
        }
        
        console.log('✅ SDK de Stripe cargado correctamente');
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Error cargando SDK de Stripe:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setIsLoading(false);
      }
    };
    
    script.onerror = () => {
      console.error('❌ Error cargando SDK de Stripe');
      setError('No se pudo cargar el SDK de Stripe');
      setIsLoading(false);
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  return { isLoading, error };
}

