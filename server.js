import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Función para importar el módulo CJS de forma dinámica
export async function useMercadoPago() {
  try {
    console.log("Cargando módulo de Mercado Pago en modo ESM");
    
    // Intentar cargar directamente el módulo CJS
    try {
      const mpModule = require('./server.cjs');
      console.log("✅ Módulo CJS cargado correctamente");
      
      // Inicializar Mercado Pago
      const mpInitialized = mpModule.initMercadoPago();
      console.log("Estado de inicialización:", mpInitialized ? "OK" : "Fallido");
      
      return {
        initMercadoPago: mpModule.initMercadoPago,
        createPaymentPreference: mpModule.createPaymentPreference,
        createFallbackPayment: mpModule.createFallbackPayment,
        success: true,
        initialized: mpInitialized
      };
    } catch (importError) {
      console.error("❌ Error al cargar el módulo CJS:", importError);
      
      // Si falla, usar el fallback
      return {
        initMercadoPago: () => false,
        createPaymentPreference: async () => ({
          success: false,
          error: 'No se pudo cargar el módulo de Mercado Pago: ' + importError.message
        }),
        createFallbackPayment,
        success: false
      };
    }
  } catch (error) {
    console.error('⚠️ Error crítico al intentar cargar Mercado Pago:', error);
    return {
      success: false,
      error: error.message,
      createFallbackPayment
    };
  }
}

// Función simple para generar enlaces de pago simulados (como fallback)
export function createFallbackPayment(options) {
  const { backUrlBase } = options;
  return {
    success: true,
    paymentLink: `${backUrlBase}/payment-bridge`,
    preferenceId: `TEST-PREF-${Date.now()}`,
    isFallback: true
  };
}