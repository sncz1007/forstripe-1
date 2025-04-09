/**
 * Implementación de Mercado Pago usando llamadas HTTP directas
 * para evitar problemas de compatibilidad con el SDK
 */

// Función para inicializar Mercado Pago y crear preferencias
export async function createPreference(options) {
  try {
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('⚠️ Error: No se encontró MERCADO_PAGO_ACCESS_TOKEN');
      throw new Error('No se encontró el token de acceso de Mercado Pago');
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    console.log('🔄 Usando token de Mercado Pago para acceso directo a la API...');

    const { items, backUrlBase, description, external_reference } = options;

    // Validar elementos
    if (!items || items.length === 0) {
      throw new Error('Se requieren productos para crear la preferencia');
    }

    // Preparamos los items - asegurando que cada uno tenga los campos requeridos
    const processedItems = items.map(item => ({
      title: item.title || 'Producto',
      description: item.description || 'Descripción del producto',
      quantity: item.quantity || 1,
      currency_id: 'CLP', // Pesos chilenos
      unit_price: Number(item.unit_price) || 0
    }));

    console.log('📦 Items preparados:', JSON.stringify(processedItems));

    // Creamos el objeto de preferencia
    const preferenceData = {
      items: processedItems,
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

    // Llamada directa a la API de Mercado Pago
    console.log('🔄 Llamando directamente a la API de Mercado Pago para crear preferencia...');
    
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    });

    // Verificar la respuesta
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error en la respuesta de Mercado Pago:', errorData);
      throw new Error(`Error de API de Mercado Pago: ${errorData.message || 'Error desconocido'}`);
    }

    // Procesar respuesta exitosa
    const data = await response.json();
    console.log('✅ Preferencia creada correctamente:', data.id);
    console.log('🔗 URL de pago generada:', data.init_point);

    // Retornamos los datos necesarios
    return {
      success: true,
      preferenceId: data.id,
      paymentLink: data.init_point
    };
  } catch (error) {
    console.error('❌ Error al crear preferencia de MercadoPago:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido'
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