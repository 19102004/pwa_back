// routes/push.js
const express = require('express');
const pushService = require('../services/pushService');

const router = express.Router();

// =========================================
// 🔑 Obtener clave pública VAPID
// =========================================
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = pushService.getPublicKey();
    console.log('📤 Enviando clave pública VAPID');
    res.json({ success: true, publicKey });
  } catch (error) {
    console.error('❌ Error obteniendo clave pública:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la clave pública'
    });
  }
});

// =========================================
// 📬 Suscribir a notificaciones
// =========================================
router.post('/subscribe', (req, res) => {
  try {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Suscripción inválida'
      });
    }
    
    const count = pushService.addSubscription(subscription);
    
    console.log('✅ Cliente suscrito a notificaciones push');
    
    res.status(201).json({
      success: true,
      message: 'Suscripción registrada correctamente',
      totalSubscriptions: count
    });
  } catch (error) {
    console.error('❌ Error al registrar suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la suscripción'
    });
  }
});

// =========================================
// 📊 Obtener información de suscripciones
// =========================================
router.get('/subscriptions', (req, res) => {
  try {
    const subscriptions = pushService.getSubscriptions();
    res.json({
      success: true,
      count: subscriptions.length,
      subscriptions: subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        // No exponer las claves completas por seguridad
      }))
    });
  } catch (error) {
    console.error('❌ Error obteniendo suscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener suscripciones'
    });
  }
});

// =========================================
// 🧪 Enviar notificación de prueba
// =========================================
router.post('/test-notification', async (req, res) => {
  try {
    await pushService.sendNotificationToAll({
      title: '🧪 Notificación de Prueba',
      body: 'Las notificaciones push están funcionando correctamente',
      icon: '/cb190r.png',
      data: { url: '/' }
    });
    
    res.json({
      success: true,
      message: 'Notificación de prueba enviada'
    });
  } catch (error) {
    console.error('❌ Error enviando notificación de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar la notificación de prueba'
    });
  }
});

// =========================================
// 🔍 Diagnóstico del sistema de notificaciones
// =========================================
router.get('/diagnostics', (req, res) => {
  try {
    const publicKey = pushService.getPublicKey();
    const subscriptions = pushService.getSubscriptions();
    
    res.json({
      success: true,
      diagnostics: {
        vapidConfigured: !!publicKey,
        publicKeyLength: publicKey ? publicKey.length : 0,
        totalSubscriptions: subscriptions.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en diagnóstico',
      error: error.message
    });
  }
});

module.exports = router;