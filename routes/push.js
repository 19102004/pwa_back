// routes/push.js
const express = require('express');
const pushService = require('../services/pushService');
const crypto = require('crypto');

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
// ⭐ NUEVO: 📬 Suscribir a notificaciones con ID único
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
    
    // ⭐ Generar ID único para cada suscripción
    const subscriptionId = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const subscriptionData = {
      id: subscriptionId,
      subscription: subscription,
      metadata: {
        userAgent: req.headers['user-agent'] || 'Unknown',
        ip: req.ip || req.connection.remoteAddress
      }
    };
    
    const count = pushService.addSubscription(subscriptionData);
    
    console.log('✅ Cliente suscrito con ID:', subscriptionId);
    
    res.status(201).json({
      success: true,
      message: 'Suscripción registrada correctamente',
      subscriptionId: subscriptionId,  // ⭐ Devolver el ID al cliente
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
// ⭐ NUEVO: 📨 Enviar notificación personalizada a un suscriptor específico
// =========================================
router.post('/send-personalized', async (req, res) => {
  try {
    const { subscriptionId, title, body, data } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'subscriptionId es requerido'
      });
    }
    
    const payload = {
      title: title || '🏍️ Notificación Personalizada',
      body: body || `Mensaje exclusivo para ${subscriptionId}`,
      icon: '/cb190r.png',
      badge: '/cb190r.png',
      data: {
        ...data,
        subscriptionId: subscriptionId,
        timestamp: Date.now()
      },
      tag: `personalized-${Date.now()}`,
      requireInteraction: true
    };
    
    const result = await pushService.sendPersonalizedNotification(subscriptionId, payload);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Notificación personalizada enviada',
        subscriptionId: subscriptionId
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error || 'Error al enviar notificación'
      });
    }
  } catch (error) {
    console.error('❌ Error enviando notificación personalizada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar la notificación personalizada'
    });
  }
});

// =========================================
// ⭐ NUEVO: 📨 Enviar notificaciones DIFERENTES a todos
// =========================================
router.post('/send-personalized-to-all', async (req, res) => {
  try {
    const { baseTitle, baseBody } = req.body;
    
    const result = await pushService.sendPersonalizedToAll((subData) => {
      return {
        title: `${baseTitle || '🏍️ Notificación'} - ${subData.id}`,
        body: `${baseBody || 'Mensaje personalizado'} (ID: ${subData.id})`,
        icon: '/cb190r.png',
        badge: '/cb190r.png',
        data: {
          subscriptionId: subData.id,
          timestamp: Date.now(),
          personalMessage: `Este es un mensaje exclusivo para ${subData.id}`
        },
        tag: `broadcast-${Date.now()}`,
        requireInteraction: true
      };
    });
    
    res.json({
      success: true,
      message: 'Notificaciones personalizadas enviadas',
      stats: {
        successful: result.successful,
        failed: result.failed,
        total: result.successful + result.failed
      }
    });
  } catch (error) {
    console.error('❌ Error enviando notificaciones personalizadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar las notificaciones personalizadas'
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
        id: sub.id,  // ⭐ Ahora incluye el ID
        endpoint: sub.subscription.endpoint.substring(0, 50) + '...',
        createdAt: sub.createdAt,
        metadata: sub.metadata
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
// ⭐ NUEVO: 🗑️ Eliminar suscripción
// =========================================
router.delete('/unsubscribe/:subscriptionId', (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const removed = pushService.removeSubscription(subscriptionId);
    
    if (removed) {
      res.json({
        success: true,
        message: 'Suscripción eliminada correctamente'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada'
      });
    }
  } catch (error) {
    console.error('❌ Error eliminando suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la suscripción'
    });
  }
});

// =========================================
// 🧪 Enviar notificación de prueba (igual para todos)
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
// ⭐ NUEVO: 🧪 Enviar notificación de prueba PERSONALIZADA
// =========================================
router.post('/test-personalized', async (req, res) => {
  try {
    const result = await pushService.sendPersonalizedToAll((subData) => {
      // Cada suscriptor recibe un emoji y mensaje diferente
      const emojis = ['🏍️', '🚀', '⚡', '🔥', '✨', '🎯', '💫', '🌟'];
      const messages = [
        'Este es TU mensaje personalizado',
        'Notificación exclusiva para ti',
        'Hey, esto es solo para ti',
        'Mensaje especial destinado a ti'
      ];
      
      const emojiIndex = parseInt(subData.id.slice(-2), 16) % emojis.length;
      const messageIndex = parseInt(subData.id.slice(-1), 16) % messages.length;
      
      return {
        title: `${emojis[emojiIndex]} Prueba Personalizada - ${subData.id}`,
        body: messages[messageIndex],
        icon: '/cb190r.png',
        badge: '/cb190r.png',
        data: {
          subscriptionId: subData.id,
          testType: 'personalized',
          uniqueMessage: `Este mensaje es ÚNICO para ${subData.id}`,
          timestamp: Date.now()
        },
        tag: `test-${Date.now()}`,
        requireInteraction: true
      };
    });
    
    res.json({
      success: true,
      message: 'Notificaciones de prueba personalizadas enviadas',
      stats: {
        successful: result.successful,
        failed: result.failed,
        total: result.successful + result.failed
      }
    });
  } catch (error) {
    console.error('❌ Error enviando notificación de prueba personalizada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar la notificación de prueba personalizada'
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
        totalSubscriptions: subscriptions.length,
        subscriptionIds: subscriptions.map(s => s.id),
        personalizedNotificationsEnabled: true  // ⭐ NUEVO
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