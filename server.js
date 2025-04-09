import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// Utilizamos una estrategia diferente para el manejo de Mercado Pago ya que hay problemas con ESM
import mercadopago from 'mercadopago';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// En lugar de usar Mercado Pago directamente, crearemos un mecanismo de simulación
// que reproduzca el comportamiento esperado para pruebas
console.log('Configurando simulador de Mercado Pago');

// Objeto simulador para Mercado Pago que imita su comportamiento
const mercadoPagoSimulator = {
  preferences: {
    async create(preference) {
      console.log('Simulando creación de preferencia en Mercado Pago:', preference);
      
      // Generar un ID único para la preferencia
      const preferenceId = `TEST-PREF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      // Para pruebas, usaremos una redirección interna en lugar de ir a Mercado Pago
      // URL de pago simulada (esta URL se verá en el navegador pero no se intentará acceder)
      const sandboxUrl = `https://www.mercadopago.cl/checkout/v1/redirect?pref_id=${preferenceId}`;
      
      // URL para redirección interna - esta es la que realmente usaremos para la simulación
      const internalUrl = `${preference.back_urls.success}?simulation=true&prefId=${preferenceId}`;
      
      // Construir respuesta similar a la de Mercado Pago
      return {
        status: 201,
        body: {
          id: preferenceId,
          // Para simulación, redirigimos directamente al success path con un parámetro de simulación
          init_point: internalUrl, 
          sandbox_init_point: sandboxUrl,
          // Agregamos información adicional para depuración
          internal_url: internalUrl,
          debug_info: {
            test_mode: true,
            simulation: true,
            payment_status: "approved"
          }
        }
      };
    }
  }
};

// Usamos el simulador en lugar de la API real
const mercadoPagoImplementation = mercadoPagoSimulator;

// Imprimir información de configuración
console.log('Simulador de Mercado Pago configurado correctamente');
console.log('Token de acceso simulado:', process.env.MERCADO_PAGO_ACCESS_TOKEN ? 
  `${process.env.MERCADO_PAGO_ACCESS_TOKEN.substring(0, 10)}...` : 
  'No disponible');

// Endpoint para generar enlace de pago con Mercado Pago
app.post('/generar-enlace', async (req, res) => {
  try {
    console.log('Solicitud recibida para generar enlace de pago:', req.body);
    const { cuotas } = req.body;
    
    if (!cuotas || !Array.isArray(cuotas) || cuotas.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron cuotas válidas' });
    }
    
    console.log('Procesando cuotas:', cuotas);
    
    // Calcular el monto total en pesos chilenos
    // Dividimos por 100 para convertir de centavos a la unidad monetaria principal
    const montoTotal = cuotas.reduce((sum, cuota) => sum + cuota.total, 0) / 100;
    
    console.log(`Monto total calculado: ${montoTotal} CLP`);
    
    // Crear una preferencia de pago con Mercado Pago
    const preference = {
      items: [
        {
          title: "Pago de Cuotas Forum",
          quantity: 1,
          unit_price: montoTotal,
          currency_id: "CLP"
        }
      ],
      back_urls: {
        success: `${req.protocol}://${req.get('host')}/payment-success`,
        failure: `${req.protocol}://${req.get('host')}/payment-failure`,
        pending: `${req.protocol}://${req.get('host')}/payment-pending`
      },
      auto_return: "approved",
      // Datos adicionales para el seguimiento
      external_reference: `FORUM-${Date.now()}`,
      // Metadatos para almacenar información de las cuotas
      metadata: {
        cuotas_ids: cuotas.map((_, index) => index).join(','),
        timestamp: Date.now()
      }
    };
    
    console.log('Preferencia de pago creada:', preference);
    
    // Generar el enlace de pago usando nuestro simulador
    const response = await mercadoPagoImplementation.preferences.create(preference);
    
    console.log('Respuesta de Mercado Pago (simulada):', response.body);
    
    // Devolver el enlace de pago al cliente
    res.json({ 
      paymentLink: response.body.init_point,
      preferenceId: response.body.id
    });
  } catch (error) {
    console.error('Error al generar enlace de pago:', error);
    res.status(500).json({ 
      error: 'Error al generar el enlace de pago', 
      details: error.message 
    });
  }
});

// Rutas para manejar redirecciones de pago
app.get('/payment-success', (req, res) => {
  // Aquí puedes manejar la redirección después de un pago exitoso
  res.redirect('/payment-success?status=approved');
});

app.get('/payment-failure', (req, res) => {
  // Aquí puedes manejar la redirección después de un pago fallido
  res.redirect('/payment-failure?status=rejected');
});

app.get('/payment-pending', (req, res) => {
  // Aquí puedes manejar la redirección después de un pago pendiente
  res.redirect('/payment-pending?status=pending');
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de integración Mercado Pago ejecutándose en el puerto ${PORT}`);
});

// Exportar app para testing o integración con otros servicios
export default app;