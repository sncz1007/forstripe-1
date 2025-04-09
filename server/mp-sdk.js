/**
 * Implementación de Mercado Pago usando el SDK actual
 */
import mercadopago from 'mercadopago';

// Función para inicializar Mercado Pago y crear preferencias
export async function createPreference(options) {
  try {
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('⚠️ Error: No se encontró MERCADO_PAGO_ACCESS_TOKEN');
      throw new Error('No se encontró el token de acceso de Mercado Pago');
    }

    console.log('🔄 Configurando MercadoPago SDK...');
    // Configurar el SDK con el token de acceso
    mercadopago.configure({
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
    });

    const { items, backUrlBase, description, external_reference } = options;

    // Validar elementos
    if (!items || items.length === 0) {
      throw new Error('Se requieren productos para crear la preferencia');
    }

    console.log('📦 Items preparados:', JSON.stringify(items));

    // Creamos el objeto de preferencia
    const preferenceData = {
      items: items,
      back_urls: {
        success: `${backUrlBase}/payment-success`,
        failure: `${backUrlBase}/payment-failure`,
        pending: `${backUrlBase}/payment-pending`
      },
      auto_return: 'approved',
      statement_descriptor: description || 'Forum Pagos',
      external_reference: external_reference || `PAGO-${Date.now()}`
    };

    console.log('🔍 Datos de preferencia:', JSON.stringify(preferenceData));

    // Creamos la preferencia usando el SDK
    console.log('🔄 Llamando a la API de Mercado Pago para crear preferencia...');
    const response = await mercadopago.preferences.create(preferenceData);
    console.log('✅ Preferencia creada correctamente:', response.body.id);

    // Retornamos los datos necesarios
    return {
      success: true,
      preferenceId: response.body.id,
      paymentLink: response.body.init_point
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