// Este archivo es un puente para poder utilizar mercadopago en modo CommonJS
const mercadopago = require('mercadopago');

// Función para inicializar Mercado Pago
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

    console.log("SDK de Mercado Pago configurado correctamente (CJS)");
    return true;
  } catch (error) {
    console.error("Error al inicializar Mercado Pago (CJS):", error);
    return false;
  }
}

/**
 * Crea una preferencia de pago en Mercado Pago
 * @param {Object} options Opciones para crear la preferencia
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
      // Configuración de métodos de pago
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

    console.log("Creando preferencia en Mercado Pago (CJS):", JSON.stringify(preference, null, 2));

    // Crear la preferencia en Mercado Pago
    const response = await mercadopago.preferences.create(preference);
    console.log("Respuesta de Mercado Pago (CJS):", JSON.stringify(response.body, null, 2));

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
    console.error("Error al crear preferencia de pago (CJS):", error);
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

// Exportamos como objeto para que sea compatible con ESM y CJS
module.exports = {
  initMercadoPago,
  createPaymentPreference,
  createFallbackPayment
};