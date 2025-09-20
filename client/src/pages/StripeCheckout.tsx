import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Configurar Stripe Promise con manejo de errores
let stripePromise: any = null;

if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
}

// Componente interno del formulario de pago
function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || 'Error al procesar el pago');
      } else {
        setMessage('Error inesperado. Por favor, intenta nuevamente.');
      }
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded without redirect, navigate to success page
      console.log('✅ Pago completado exitosamente');
      setLocation(`/payment-success?payment_intent=${paymentIntent.id}&payment_intent_client_secret=${paymentIntent.client_secret}`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-center mb-6">
              Procesar Pago
            </h1>
            
            <form onSubmit={handleSubmit} data-testid="stripe-payment-form">
              <PaymentElement data-testid="stripe-payment-element" />
              
              {message && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700" data-testid="error-message">
                  {message}
                </div>
              )}
              
              <Button 
                type="submit" 
                disabled={!stripe || loading} 
                className="w-full mt-6"
                data-testid="submit-payment-button"
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
                data-testid="back-to-quotas-button"
              >
                Volver a selección de cuotas
              </button>
            </div>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default function StripeCheckout() {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Verificar si tenemos la clave pública de Stripe
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      console.error('VITE_STRIPE_PUBLIC_KEY no está configurada');
      setLocation('/payment-quotas');
      return;
    }

    // Obtener el client secret del sessionStorage
    const secret = sessionStorage.getItem('stripeClientSecret');
    if (!secret) {
      console.error('No se encontró el client secret de Stripe');
      setLocation('/payment-quotas');
      return;
    }
    
    setClientSecret(secret);
  }, [setLocation]);

  // Mostrar error si no hay clave pública
  if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6 max-w-md mx-auto">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error de Configuración</h1>
          <p className="text-gray-700 mb-4">
            La configuración de Stripe no está disponible. Por favor, contacta al administrador.
          </p>
          <Button onClick={() => setLocation('/payment-quotas')} data-testid="back-to-quotas-error">
            Volver a selección de cuotas
          </Button>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm />
    </Elements>
  );
}