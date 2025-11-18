const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");
const pushService = require('../services/pushService');

// ============================================
// 📝 REGISTRAR USUARIO
// ============================================
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await Usuario.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const newUser = new Usuario({ username, password });
    await newUser.save();

    res.json({ message: "Usuario registrado", username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
});

// ============================================
// 🔐 LOGIN
// ============================================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Usuario.findOne({ username });

    if (!user) return res.status(400).json({ message: "Usuario no encontrado" });

    if (user.password !== password)
      return res.status(400).json({ message: "Contraseña incorrecta" });

    res.json({ 
      message: "Login exitoso", 
      username: user.username,
      admin: user.admin 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error en el login" });
  }
});

// ============================================
// 📋 OBTENER TODOS LOS USUARIOS
// ============================================
router.get("/todos", async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password');
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});

// ============================================
// ⭐ ASOCIAR SUSCRIPCIÓN PUSH A UN USUARIO
// ============================================
router.post("/subscribe-push", async (req, res) => {
  try {
    const { username, subscription, subscriptionId } = req.body;
    
    console.log('');
    console.log('🔗 ========================================');
    console.log('🔗 ASOCIANDO SUSCRIPCIÓN A USUARIO');
    console.log('🔗 Username recibido:', username);
    console.log('🔗 SubscriptionId:', subscriptionId);
    console.log('🔗 Subscription endpoint:', subscription?.endpoint?.substring(0, 60) + '...');
    console.log('🔗 ========================================');
    
    // Validaciones
    if (!username || !subscription || !subscriptionId) {
      console.error('❌ Faltan datos:', { username: !!username, subscription: !!subscription, subscriptionId: !!subscriptionId });
      return res.status(400).json({ 
        success: false,
        message: "Faltan datos requeridos (username, subscription, subscriptionId)" 
      });
    }

    // Validar estructura de subscription
    if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      console.error('❌ Subscription inválida:', subscription);
      return res.status(400).json({
        success: false,
        message: "Estructura de subscription inválida"
      });
    }
    
    const user = await Usuario.findOne({ username });
    
    if (!user) {
      console.error('❌ Usuario no encontrado:', username);
      return res.status(404).json({ 
        success: false,
        message: "Usuario no encontrado" 
      });
    }
    
    console.log('✅ Usuario encontrado:', user.username);
    
    // Guardar suscripción en el usuario
    user.pushSubscription = {
      subscriptionId: subscriptionId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      subscribedAt: new Date()
    };
    
    await user.save();
    
    console.log('✅ Suscripción guardada en la base de datos');
    console.log('   Usuario:', user.username);
    console.log('   SubscriptionId:', subscriptionId);
    console.log('   Endpoint:', subscription.endpoint.substring(0, 60) + '...');
    console.log('🔗 ========================================');
    console.log('');
    
    res.json({ 
      success: true,
      message: "Suscripción asociada correctamente",
      username: user.username,
      subscriptionId: subscriptionId
    });
    
  } catch (err) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ ERROR AL ASOCIAR SUSCRIPCIÓN');
    console.error('❌ Error:', err);
    console.error('❌ ========================================');
    console.error('');
    
    res.status(500).json({ 
      success: false,
      message: "Error al asociar suscripción",
      error: err.message
    });
  }
});

// ============================================
// ⭐ ENVIAR NOTIFICACIÓN PUSH A UN USUARIO ESPECÍFICO
// ============================================
router.post("/send-notification/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, body, data } = req.body;
    
    console.log('');
    console.log('📤 ========================================');
    console.log('📤 ENVIANDO NOTIFICACIÓN A USUARIO');
    console.log('📤 UserId:', userId);
    console.log('📤 Título:', title);
    console.log('📤 Mensaje:', body);
    console.log('📤 ========================================');
    
    const user = await Usuario.findById(userId);
    
    if (!user) {
      console.log(`❌ Usuario no encontrado: ${userId}`);
      return res.status(404).json({ 
        success: false,
        message: "Usuario no encontrado" 
      });
    }
    
    console.log(`✅ Usuario encontrado: ${user.username}`);
    
    if (!user.pushSubscription || !user.pushSubscription.endpoint) {
      console.log(`❌ Usuario ${user.username} no tiene suscripción push`);
      return res.status(400).json({ 
        success: false,
        message: "Usuario no está suscrito a notificaciones push" 
      });
    }
    
    // ⭐ VALIDACIÓN CRÍTICA: Verificar que tenga las keys
    if (!user.pushSubscription.keys || 
        !user.pushSubscription.keys.p256dh || 
        !user.pushSubscription.keys.auth) {
      console.log(`❌ Usuario ${user.username} tiene suscripción incompleta (faltan keys)`);
      return res.status(400).json({
        success: false,
        message: "Suscripción incompleta - faltan keys de encriptación"
      });
    }
    
    console.log(`✅ Usuario ${user.username} tiene suscripción válida`);
    console.log(`   Endpoint: ${user.pushSubscription.endpoint.substring(0, 50)}...`);
    console.log(`   Keys p256dh: ${user.pushSubscription.keys.p256dh.substring(0, 20)}...`);
    console.log(`   Keys auth: ${user.pushSubscription.keys.auth.substring(0, 20)}...`);
    
    // ⭐ CONSTRUIR OBJETO DE SUSCRIPCIÓN CORRECTAMENTE
    const subscriptionObject = {
      endpoint: user.pushSubscription.endpoint,
      keys: {
        p256dh: user.pushSubscription.keys.p256dh,
        auth: user.pushSubscription.keys.auth
      }
    };
    
    const payload = {
      title: title || '🏍️ Recordatorio',
      body: body || 'Recuerda hacer tu cotización',
      icon: '/cb190r.png',
      badge: '/cb190r.png',
      data: {
        ...data,
        userId: user._id.toString(),
        username: user.username,
        timestamp: Date.now()
      },
      tag: `user-notification-${Date.now()}`,
      requireInteraction: true
    };
    
    console.log('📨 Enviando notificación push...');
    console.log('   Payload:', JSON.stringify(payload, null, 2));
    
    // ⭐ USAR LA NUEVA FUNCIÓN sendNotificationToSubscription
    const result = await pushService.sendNotificationToSubscription(
      subscriptionObject,
      payload
    );
    
    if (result.success) {
      console.log(`✅ Notificación enviada exitosamente a ${user.username}`);
      console.log('📤 ========================================');
      console.log('');
      
      res.json({
        success: true,
        message: `Notificación enviada a ${user.username}`,
        username: user.username
      });
    } else {
      console.log(`❌ Error al enviar notificación: ${result.error}`);
      console.log('📤 ========================================');
      console.log('');
      
      // Si la suscripción ya no es válida (410 Gone), eliminarla de la DB
      if (result.shouldDelete) {
        user.pushSubscription = undefined;
        await user.save();
        console.log(`🗑️ Suscripción inválida eliminada del usuario ${user.username}`);
      }
      
      res.status(500).json({
        success: false,
        message: result.error || 'Error al enviar notificación'
      });
    }
    
  } catch (err) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ ERROR EN send-notification');
    console.error('❌ Error:', err);
    console.error('❌ Stack:', err.stack);
    console.error('❌ ========================================');
    console.error('');
    
    res.status(500).json({ 
      success: false,
      message: "Error al enviar notificación",
      error: err.message
    });
  }
});

// ============================================
// 🗑️ ELIMINAR SUSCRIPCIÓN DE UN USUARIO
// ============================================
router.delete("/unsubscribe-push/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await Usuario.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }
    
    if (!user.pushSubscription) {
      return res.status(400).json({
        success: false,
        message: "Usuario no tiene suscripción activa"
      });
    }
    
    user.pushSubscription = undefined;
    await user.save();
    
    console.log(`🗑️ Suscripción eliminada del usuario: ${username}`);
    
    res.json({
      success: true,
      message: "Suscripción eliminada correctamente",
      username: user.username
    });
    
  } catch (err) {
    console.error('❌ Error al eliminar suscripción:', err);
    res.status(500).json({
      success: false,
      message: "Error al eliminar suscripción"
    });
  }
});

module.exports = router;