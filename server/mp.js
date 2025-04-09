/**
 * Implementación oficial de Mercado Pago siguiendo la documentación actual
 * https://github.com/mercadopago/checkout-payment-sample
 */

// Importamos Mercado Pago
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Función para inicializar Mercado Pago y crear preferencias
export async function createPreference(options) {
  try {
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('⚠️ Error: No se encontró MERCADO_PAGO_ACCESS_TOKEN');
      throw new Error('No se encontró el token de acceso de Mercado Pago');
    }

    console.log('🔄 Inicializando MercadoPago SDK...');
    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
    });

    console.log('🔄 Creando instancia de Preference...');
    const preference = new Preference(client);

    const { items, backUrls, description, external_reference } = options;

    // Validar elementos
    if (!items || items.length === 0) {
      throw new Error('Se requieren productos para crear la preferencia');
    }

    // Mapeamos los items al formato correcto de Mercado Pago
    const mpItems = items.map(item => {
      return {
        title: item.title || 'Producto',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        currency_id: 'CLP'  // Moneda chilena
      };
    });

    console.log('📦 Items preparados:', JSON.stringify(mpItems));

    // Creamos el objeto de preferencia
    const preferenceData = {
      body: {
        items: mpItems,
        back_urls: backUrls || {
          success: `${options.backUrlBase}/payment-success`,
          failure: `${options.backUrlBase}/payment-failure`,
          pending: `${options.backUrlBase}/payment-pending`
        },
        auto_return: 'approved',
        statement_descriptor: description || 'Forum Pagos',
        external_reference: external_reference || `PAGO-${Date.now()}`
      }
    };

    console.log('🔍 Datos de preferencia:', JSON.stringify(preferenceData));

    // Creamos la preferencia
    console.log('🔄 Llamando a la API de Mercado Pago para crear preferencia...');
    const result = await preference.create(preferenceData);
    console.log('✅ Preferencia creada correctamente:', result.id);

    // Retornamos los datos necesarios
    return {
      success: true,
      preferenceId: result.id,
      initPoint: result.init_point, // URL de pago
      paymentLink: result.init_point
    };
  } catch (error) {
    console.error('❌ Error al crear preferencia de MercadoPago:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Función para simular el pago cuando hay errores
export function createFallbackPayment(options) {
  console.log('⚠️ Usando pago simulado (fallback)');
  const { backUrlBase } = options;
  return {
    success: true,
    preferenceId: `TEST-PREF-${Date.now()}`,
    paymentLink: `${backUrlBase}/payment-bridge`,
    isFallback: true
  };
}