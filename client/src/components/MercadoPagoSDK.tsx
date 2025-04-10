import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

/**
 * Esta función crea una preferencia de pago usando el servidor proxy
 * para evitar problemas de CORS con Mercado Pago
 */
export async function createPreference(paymentData: any) {
  console.log('💲 Creando preferencia a través del proxy');
  
  try {
    const response = await apiRequest(
      'POST',
      '/api/mercadopago-proxy',
      {
        endpoint: '/checkout/preferences',
        method: 'POST',
        body: {
          items: paymentData.items,
          back_urls: {
            success: paymentData.backUrls.success,
            failure: paymentData.backUrls.failure,
            pending: paymentData.backUrls.pending,
          },
          auto_return: 'approved',
          statement_descriptor: paymentData.description || 'Forum Pagos',
          external_reference: `PAYMENT-${Date.now()}`
        }
      }
    );
    
    const data = await response.json();
    console.log('✅ Preferencia creada:', data);
    
    return {
      success: true,
      preferenceId: data.id,
      paymentLink: data.init_point,
      sandboxPaymentLink: data.sandbox_init_point,
      data: data
    };
  } catch (error) {
    console.error('❌ Error creando preferencia:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Hook para usar Mercado Pago en componentes React
 */
export function useMercadoPago(preferenceId?: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    
    script.onload = () => {
      try {
        if (typeof window.MercadoPago === 'undefined') {
          throw new Error('El SDK de Mercado Pago no se cargó correctamente');
        }
        
        console.log('✅ SDK de Mercado Pago cargado correctamente');
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Error cargando SDK de Mercado Pago:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setIsLoading(false);
      }
    };
    
    script.onerror = () => {
      console.error('❌ Error cargando SDK de Mercado Pago');
      setError('No se pudo cargar el SDK de Mercado Pago');
      setIsLoading(false);
    };
    
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  return { isLoading, error };
}

// Añadir la definición global para TypeScript
declare global {
  interface Window {
    MercadoPago: any;
  }
}