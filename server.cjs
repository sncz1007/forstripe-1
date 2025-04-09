const express = require('express');
const path = require('path');
const mercadopago = require('mercadopago');

// Configurar Mercado Pago con el Access Token de prueba
mercadopago.configure({ 
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN 
});

const app = express();

// Configuración de middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('✅ Servidor de Mercado Pago importado correctamente');
console.log('Token de acceso simulado:', process.env.MERCADO_PAGO_ACCESS_TOKEN ? 
  `${process.env.MERCADO_PAGO_ACCESS_TOKEN.substring(0, 10)}...` : 
  'No disponible');

// Endpoint para generar enlace de pago con Mercado Pago Checkout Pro
app.post('/generar-enlace', async (req, res) => {
  try {
    const { cuotas } = req.body;
    console.log('Cuotas recibidas:', cuotas);

    if (!cuotas || !Array.isArray(cuotas) || cuotas.length === 0) {
      console.error('Error: No se proporcionaron cuotas válidas', req.body);
      return res.status(400).json({ error: 'No se proporcionaron cuotas válidas' });
    }

    // Calcular el monto total (asumimos que 'total' está en centavos)
    const montoTotal = cuotas.reduce((sum, cuota) => sum + cuota.total, 0) / 100;
    console.log('Monto total calculado:', montoTotal);

    // Configurar la preferencia de pago
    const preference = {
      items: [
        {
          title: "Pago de Cuotas",
          quantity: 1,
          unit_price: montoTotal,
          currency_id: "CLP"
        }
      ],
      back_urls: {
        success: `${req.protocol}://${req.get('host')}/payment-success`,
        failure: `${req.protocol}://${req.get('host')}/payment-failure`,
        pending: `${req.protocol}://${req.get('host')}/payment-pending`
      }
      // Nota: Se elimina el auto_return para evitar redirecciones prematuras
    };
    console.log('Preferencia enviada:', preference);

    // Crear la preferencia en Mercado Pago
    const response = await mercadopago.preferences.create(preference);
    console.log('Respuesta de Mercado Pago:', response.body);

    // Responder con el enlace de pago
    res.json({ 
      paymentLink: response.body.init_point,
      preferenceId: response.body.id
    });
  } catch (error) {
    console.error('Error al generar el enlace:', error);
    res.status(500).json({ error: 'Error al generar el enlace' });
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

// No necesitamos iniciar el servidor aquí, lo hacemos desde server/index.ts
// Solo exponemos la app para que pueda ser usada

module.exports = app;