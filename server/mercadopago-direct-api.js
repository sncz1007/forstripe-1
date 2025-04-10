/**
 * Implementación directa a la API de Mercado Pago sin SDK
 * Esto evita problemas de compatibilidad con modelos de importación
 */

// Función para crear una preferencia de pago en Mercado Pago
export async function createMercadoPagoPreference(options) {
  try {
    console.log('🔄 Iniciando creación de preferencia con API directa de Mercado Pago');
    
    // Verificamos el token de acceso
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('No se encontró MERCADO_PAGO_ACCESS_TOKEN en las variables de entorno');
    }
    
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    console.log('🔑 Token de Mercado Pago configurado');
    console.log('🔑 Longitud del token:', accessToken.length);
    
    const { items, backUrlBase, description } = options;
    
    // Validamos elementos mínimos requeridos
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Se requieren items para crear la preferencia');
    }
    
    // Preparamos los items en formato esperado por Mercado Pago
    const mercadoPagoItems = items.map(item => {
      console.log('💰 Procesando item:', JSON.stringify(item));
      
      // Obtenemos precio unitario asegurándonos que sea un número
      let unitPrice = 0;
      if (typeof item.unit_price === 'number') {
        unitPrice = item.unit_price;
      } else if (item.unit_price) {
        unitPrice = parseFloat(String(item.unit_price).replace(/[^\d.]/g, ''));
      }
      
      console.log(`📊 Item procesado con precio unitario: ${unitPrice}`);
      
      return {
        title: item.title || 'Producto',
        description: item.description || 'Sin descripción',
        quantity: item.quantity || 1,
        currency_id: 'CLP', // Moneda en pesos chilenos
        unit_price: unitPrice
      };
    });
    
    // Construimos el objeto de preferencia
    const preferenceData = {
      items: mercadoPagoItems,
      back_urls: {
        success: `${backUrlBase}/payment-success`,
        failure: `${backUrlBase}/payment-failure`,
        pending: `${backUrlBase}/payment-pending`
      },
      auto_return: 'approved',
      statement_descriptor: description || 'Forum Pagos',
      external_reference: `PAYMENT-${Date.now()}`
    };
    
    console.log('📦 Datos de preferencia:', JSON.stringify(preferenceData));
    
    // Realizamos la llamada directa a la API
    console.log('📡 Enviando solicitud a la API de Mercado Pago...');
    console.log('📡 URL: https://api.mercadopago.com/checkout/preferences');
    console.log('📡 Token utilizado (primeros 10 caracteres + longitud): ', 
        accessToken.substring(0, 10) + '... [longitud total: ' + accessToken.length + ']');
    console.log('📡 Datos enviados: ', JSON.stringify(preferenceData, null, 2));
    
    let response;
    let responseText;
    
    try {
      console.log('🚀 Iniciando petición a Mercado Pago con Node Fetch');
      
      // Realizamos la petición con la API directa de Mercado Pago
      response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Forum-Payment-Server/1.0'
        },
        body: JSON.stringify(preferenceData)
      });
      
      // Mostramos información sobre la respuesta HTTP
      console.log('🔍 Código de estado HTTP:', response.status);
      console.log('🔍 Headers de respuesta:', [...response.headers.entries()]);
      
      // Obtenemos la respuesta completa en texto
      responseText = await response.text();
      console.log('🔍 Respuesta completa de la API:', responseText);
    } catch (fetchError) {
      console.error('❌ Error durante la llamada fetch:', fetchError);
      throw fetchError;
    }
    
    // Si no es un formato JSON válido, fallamos
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error('❌ Error al parsear la respuesta JSON:', error);
      throw new Error(`Respuesta inválida de la API de Mercado Pago: ${responseText}`);
    }
    
    // Verificamos si hubo algún error
    if (!response.ok) {
      console.error('❌ Error en la respuesta de Mercado Pago:', responseData);
      throw new Error(`Error de API de Mercado Pago: ${responseData.message || JSON.stringify(responseData)}`);
    }
    
    console.log('✅ Preferencia creada correctamente');
    console.log('🔗 ID de preferencia:', responseData.id);
    console.log('🔗 URL de pago (init_point):', responseData.init_point);
    
    // Devolvemos los datos necesarios
    return {
      success: true,
      preferenceId: responseData.id,
      paymentLink: responseData.init_point,
      sandboxPaymentLink: responseData.sandbox_init_point
    };
  } catch (error) {
    console.error('❌ Error al crear preferencia en Mercado Pago:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al crear preferencia'
    };
  }
}

// Función de fallback para cuando falla la integración
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