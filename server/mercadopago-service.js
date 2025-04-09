// Servicio de integración con Mercado Pago
import mercadopago from 'mercadopago';

// Configuración de la integración con Mercado Pago
function initMercadoPago() {
  try {
    // Verificar que existe el token de acceso
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("No se encontró el token de acceso de Mercado Pago");
      return false;
    }

    // Configurar SDK con el token de acceso
    mercadopago.configure({
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
    });

    console.log("SDK de Mercado Pago configurado correctamente");
    return true;
  } catch (error) {
    console.error("Error al inicializar Mercado Pago:", error);
    return false;
  }
}

/**
 * Crea una preferencia de pago en Mercado Pago
 * @param {Object} options Opciones para crear la preferencia
 * @param {number} options.amount Monto a pagar
 * @param {string} options.backUrlBase URL base para las redirecciones
 * @param {string} options.description Descripción del pago
 * @returns {Promise<Object>} Resultado de la creación de la preferencia
 */
async function createPaymentPreference(options) {
  try {
    const { amount, backUrlBase, description = "Pago de cuota", items = [] } = options;

    // Si no hay monto o es inválido, rechazar
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error("El monto a pagar es inválido");
    }

    // Crear items por defecto si no se proporcionaron
    const defaultItems = [{
      title: description,
      quantity: 1,
      unit_price: parseFloat(amount)
    }];

    // Configurar la preferencia de pago
    const preference = {
      items: items.length > 0 ? items : defaultItems,
      back_urls: {
        success: `${backUrlBase}/payment-success`,
        failure: `${backUrlBase}/payment-failure`,
        pending: `${backUrlBase}/payment-pending`
      },
      auto_return: "approved",
      // Aseguramos que la moneda sea CLP (Pesos chilenos)
      payment_methods: {
        excluded_payment_types: [
          { id: "atm" },
          { id: "ticket" }
        ],
        installments: 1
      },
      statement_descriptor: "Forum Pagos",
      // Metadata para identificar este pago en callbacks
      external_reference: `FORUM-${Date.now()}`
    };

    console.log("Creando preferencia en Mercado Pago:", JSON.stringify(preference, null, 2));

    // Crear la preferencia en Mercado Pago
    const response = await mercadopago.preferences.create(preference);
    console.log("Respuesta de Mercado Pago:", response);

    // Verificar si la creación fue exitosa
    if (response.body && response.body.id) {
      return {
        success: true,
        preferenceId: response.body.id,
        paymentLink: response.body.init_point
      };
    } else {
      throw new Error("No se pudo obtener el ID de preferencia");
    }
  } catch (error) {
    console.error("Error al crear preferencia de pago:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Función de fallback para crear un enlace de pago simulado
 * @param {Object} options Opciones para crear el enlace
 * @returns {Object} Enlace y preferencia simulados
 */
function createFallbackPayment(options) {
  const { backUrlBase } = options;
  return {
    success: true,
    paymentLink: `${backUrlBase}/payment-bridge`,
    preferenceId: `TEST-PREF-${Date.now()}`,
    isFallback: true
  };
}

export {
  initMercadoPago,
  createPaymentPreference,
  createFallbackPayment
};