import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    Kushki: any;
  }
}

export default function KushkiCheckout() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string>('');
  
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('');
  const [cardExpYear, setCardExpYear] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const kushkiRef = useRef<any>(null);

  const amount = parseInt(sessionStorage.getItem('totalAmount') || '0', 10);
  const requestId = sessionStorage.getItem('paymentRequestId') || '';
  const selectedQuotas = sessionStorage.getItem('selectedQuotaIndices') || '[]';

  useEffect(() => {
    const publicKey = import.meta.env.VITE_KUSHKI_PUBLIC_KEY;
    if (!publicKey) {
      setSdkError('Kushki no está configurado correctamente');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.kushkipagos.com/kushki.min.js';
    script.async = true;

    script.onload = () => {
      try {
        kushkiRef.current = new window.Kushki({
          merchantId: publicKey,
          inTestEnvironment: false,
          regional: false
        });
        setSdkLoaded(true);
      } catch (err) {
        setSdkError(err instanceof Error ? err.message : 'Error inicializando Kushki');
      }
    };

    script.onerror = () => {
      setSdkError('No se pudo cargar el SDK de Kushki');
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kushkiRef.current) {
      setMessage('El sistema de pago no está listo. Por favor espere.');
      return;
    }

    if (!cardName || !cardNumber || !cardExpMonth || !cardExpYear || !cardCvv) {
      setMessage('Por favor complete todos los campos de la tarjeta.');
      return;
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      setMessage('Número de tarjeta inválido.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = await new Promise<string>((resolve, reject) => {
        kushkiRef.current.requestToken({
          amount: amount.toString(),
          currency: 'CLP',
          card: {
            name: cardName,
            number: cleanCardNumber,
            cvc: cardCvv,
            expiryMonth: cardExpMonth.padStart(2, '0'),
            expiryYear: cardExpYear.length === 2 ? cardExpYear : cardExpYear.slice(-2)
          }
        }, (response: any) => {
          if (response.code && response.code !== '000') {
            reject(new Error(response.message || 'Error al tokenizar la tarjeta'));
          } else if (response.token) {
            resolve(response.token);
          } else {
            reject(new Error('No se recibió token de Kushki'));
          }
        });
      });

      const chargeResponse = await fetch('/generar-enlace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId,
          selectedQuotaIndices: JSON.parse(selectedQuotas),
          kushkiToken: token
        })
      });

      const chargeResult = await chargeResponse.json();

      if (chargeResult.success && chargeResult.approved) {
        setSuccess(true);
        setTicketNumber(chargeResult.ticketNumber || '');
        sessionStorage.setItem('paymentTicket', chargeResult.ticketNumber || '');
        sessionStorage.setItem('paymentTransactionId', chargeResult.transactionId || '');
        
        setTimeout(() => {
          setLocation('/payment-success');
        }, 2000);
      } else {
        setMessage(chargeResult.error || 'Error al procesar el pago. Por favor, intente nuevamente.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error inesperado. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sdkError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6 max-w-md mx-auto">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error de Configuración</h1>
          <p className="text-gray-700 mb-4">{sdkError}</p>
          <Button onClick={() => setLocation('/payment-quotas')}>
            Volver a selección de cuotas
          </Button>
        </Card>
      </div>
    );
  }

  if (!sdkLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="p-6 text-center">
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Pago Exitoso</h1>
              <p className="text-gray-600 mb-2">Su pago ha sido procesado correctamente.</p>
              {ticketNumber && (
                <p className="text-sm text-gray-500">Ticket: {ticketNumber}</p>
              )}
              <p className="text-sm text-gray-400 mt-4">Redirigiendo...</p>
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
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-center mb-2">
              Procesar Pago
            </h1>
            {amount > 0 && (
              <p className="text-center text-gray-600 mb-6">
                Total a pagar: <span className="font-bold text-lg">${amount.toLocaleString('es-CL')} CLP</span>
              </p>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre en la tarjeta
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de tarjeta
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mes
                    </label>
                    <input
                      type="text"
                      value={cardExpMonth}
                      onChange={(e) => setCardExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder="MM"
                      maxLength={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Año
                    </label>
                    <input
                      type="text"
                      value={cardExpYear}
                      onChange={(e) => setCardExpYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder="YY"
                      maxLength={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
              
              {message && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
                  {message}
                </div>
              )}
              
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full mt-6"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Procesando...</span>
                  </>
                ) : (
                  'Pagar Ahora'
                )}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <button 
                onClick={() => setLocation('/payment-quotas')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Volver a selección de cuotas
              </button>
            </div>
            
            <div className="mt-4 flex items-center justify-center text-xs text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Pago seguro procesado por Kushki
            </div>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
