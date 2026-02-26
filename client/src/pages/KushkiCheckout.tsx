import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function KushkiCheckout() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const amount = parseInt(sessionStorage.getItem('totalAmount') || '0', 10);
  const requestId = sessionStorage.getItem('paymentRequestId') || '';
  const selectedQuotas = sessionStorage.getItem('selectedQuotaIndices') || '[]';

  useEffect(() => {
    async function createCheckout() {
      try {
        if (!requestId) {
          setError('No se encontró la solicitud de pago');
          setLoading(false);
          return;
        }

        const response = await fetch('/generar-enlace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: requestId,
            selectedQuotaIndices: JSON.parse(selectedQuotas)
          })
        });

        const result = await response.json();

        if (result.success && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          setError(result.error || 'Error al crear el checkout de pago');
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al procesar el pago');
        setLoading(false);
      }
    }

    createCheckout();
  }, [requestId, selectedQuotas]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="p-6">
              <h1 className="text-xl font-bold text-red-600 mb-4">Error en el Pago</h1>
              <p className="text-gray-700 mb-4">{error}</p>
              <Button onClick={() => setLocation('/payment-quotas')} className="w-full">
                Volver a selección de cuotas
              </Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-6 text-center">
            <LoadingSpinner />
            <h1 className="text-xl font-bold mt-4 mb-2">Redirigiendo al pago seguro</h1>
            {amount > 0 && (
              <p className="text-gray-600 mb-4">
                Total a pagar: <span className="font-bold text-lg">${amount.toLocaleString('es-CL')} CLP</span>
              </p>
            )}
            <p className="text-sm text-gray-500">
              Serás redirigido a la pasarela de pago segura de Billpocket para completar tu pago con 3D Secure.
            </p>
            <div className="mt-4 flex items-center justify-center text-xs text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Pago seguro procesado por Billpocket
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
