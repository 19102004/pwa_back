// services/pushService.js - VERSIÓN CORREGIDA Y COMPLETA
const webpush = require('web-push');
const path = require('path');
const fs = require('fs');

// Leer claves VAPID desde el archivo JSON
const vapidConfigPath = path.join(__dirname, '../config/vapid.json');
let vapidKeys = {
  publicKey: '',
  privateKey: '',
  subject: 'mailto:admin@motoshonda.com'
};

try {
  const configData = fs.readFileSync(vapidConfigPath, 'utf8');
  vapidKeys = JSON.parse(configData);
  console.log('✅ Claves VAPID cargadas desde config/vapid.json');
  console.log('🔑 Public Key:', vapidKeys.publicKey.substring(0, 20) + '...');
} catch (error) {
  console.error('❌ Error leyendo config/vapid.json:', error.message);
}

// Configurar web-push con las claves VAPID
webpush.setVapidDetails(
  vapidKeys.subject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Array para almacenar suscripciones legacy (compatibilidad)
let subscriptions = [];

/**
 * ⭐ FUNCIÓN PRINCIPAL: Enviar notificación usando objeto de suscripción directo
 * @param {Object} subscriptionObject - { endpoint, keys: { p256dh, auth } }
 * @param {Object} payload - Contenido de la notificación
 */
const sendNotificationToSubscription = async (subscriptionObject, payload) => {
  try {
    // Validar que el objeto de suscripción tenga los campos necesarios
    if (!subscriptionObject || !subscriptionObject.endpoint) {
      throw new Error('Objeto de suscripción inválido: falta endpoint');
    }

    if (!subscriptionObject.keys || !subscriptionObject.keys.p256dh || !subscriptionObject.keys.auth) {
      throw new Error('Objeto de suscripción inválido: faltan keys (p256dh o auth)');
    }

    const notificationPayload = JSON.stringify(payload);
    
    console.log('📤 Enviando notificación push...');
    console.log('   Endpoint:', subscriptionObject.endpoint.substring(0, 60) + '...');
    
    await webpush.sendNotification(subscriptionObject, notificationPayload);
    
    console.log('✅ Notificación enviada exitosamente');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error enviando notificación:', error.message);
    
    // Si el endpoint ya no es válido (410 Gone)
    if (error.statusCode === 410) {
      console.log('🗑️ Suscripción inválida (410 Gone) - debería eliminarse de la DB');
      return { success: false, error: error.message, shouldDelete: true };
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Agregar una nueva suscripción (legacy - para compatibilidad con /push/subscribe)
 */
const addSubscription = (subscriptionData) => {
  const { id, subscription, metadata = {} } = subscriptionData;
  
  const existingIndex = subscriptions.findIndex(
    sub => sub.subscription.endpoint === subscription.endpoint
  );
  
  if (existingIndex !== -1) {
    subscriptions[existingIndex] = {
      ...subscriptionData,
      updatedAt: Date.now()
    };
    console.log('🔄 Suscripción actualizada:', id);
  } else {
    subscriptions.push({
      ...subscriptionData,
      createdAt: Date.now()
    });
    console.log('✅ Nueva suscripción agregada:', id);
  }
  
  return subscriptions.length;
};

/**
 * Obtener todas las suscripciones (legacy)
 */
const getSubscriptions = () => {
  return subscriptions;
};

/**
 * Obtener una suscripción por ID (legacy)
 */
const getSubscriptionById = (subscriptionId) => {
  return subscriptions.find(sub => sub.id === subscriptionId);
};

/**
 * ⭐ DEPRECADO - Usar sendNotificationToSubscription() en su lugar
 */
const sendPersonalizedNotification = async (subscriptionIdOrObject, payload) => {
  console.warn('⚠️ sendPersonalizedNotification está deprecada, usa sendNotificationToSubscription');
  
  // Si recibimos un objeto directamente (nuevo comportamiento)
  if (typeof subscriptionIdOrObject === 'object' && subscriptionIdOrObject.endpoint) {
    return await sendNotificationToSubscription(subscriptionIdOrObject, payload);
  }
  
  // Comportamiento legacy (buscar por ID)
  const subData = subscriptions.find(s => s.id === subscriptionIdOrObject);
  
  if (!subData) {
    console.error(`❌ Suscripción ${subscriptionIdOrObject} no encontrada`);
    return { success: false, error: 'Suscripción no encontrada' };
  }

  return await sendNotificationToSubscription(subData.subscription, payload);
};

/**
 * Enviar notificaciones DIFERENTES a cada suscriptor (legacy)
 */
const sendPersonalizedToAll = async (payloadGenerator) => {
  console.log(`📤 Enviando notificaciones personalizadas a ${subscriptions.length} suscriptores...`);
  
  const results = await Promise.allSettled(
    subscriptions.map(async (subData) => {
      try {
        const personalizedPayload = payloadGenerator(subData);
        const result = await sendNotificationToSubscription(subData.subscription, personalizedPayload);
        
        if (result.success) {
          console.log(`✅ Notificación personalizada enviada a ${subData.id}`);
          return { success: true, subscriptionId: subData.id };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error(`❌ Error enviando a ${subData.id}:`, error.message);
        
        if (error.statusCode === 410) {
          subscriptions = subscriptions.filter(s => s.id !== subData.id);
          console.log(`🗑️ Suscripción inválida eliminada: ${subData.id}`);
        }
        
        return { success: false, subscriptionId: subData.id, error: error.message };
      }
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  
  console.log(`📊 Resumen: ${successful} exitosas, ${failed} fallidas`);
  
  return { successful, failed, results };
};

/**
 * Enviar notificación igual a todas las suscripciones (legacy)
 */
const sendNotificationToAll = async (payload) => {
  const notificationPayload = JSON.stringify(payload);
  
  console.log(`📤 Enviando notificación a ${subscriptions.length} suscriptores...`);
  
  const promises = subscriptions.map(async (subData, index) => {
    try {
      await webpush.sendNotification(subData.subscription, notificationPayload);
      console.log(`✅ Notificación enviada a suscriptor ${index + 1}`);
    } catch (error) {
      console.error(`❌ Error enviando notificación a suscriptor ${index + 1}:`, error.message);
      
      if (error.statusCode === 410) {
        subscriptions = subscriptions.filter(sub => sub.id !== subData.id);
        console.log('🗑️ Suscripción inválida eliminada');
      }
    }
  });
  
  await Promise.allSettled(promises);
};

/**
 * Enviar notificación de nueva cotización (legacy)
 */
const sendQuotationNotification = async (cotizacion) => {
  const payload = {
    title: '🏍️ Nueva Cotización Recibida',
    body: `${cotizacion.nombre} ha solicitado cotización para ${cotizacion.moto}`,
    icon: '/cb190r.png',
    badge: '/cb190r.png',
    data: {
      url: '/',
      cotizacion: cotizacion
    },
    tag: 'quotation-notification',
    requireInteraction: true
  };
  
  await sendNotificationToAll(payload);
};

/**
 * Enviar notificación personalizada de nueva cotización (legacy)
 */
const sendPersonalizedQuotationNotification = async (cotizacion) => {
  return await sendPersonalizedToAll((subData) => {
    const customMessages = [
      `¡Hola ${subData.id}! Nueva cotización de ${cotizacion.nombre}`,
      `${subData.id}, revisa esta cotización para ${cotizacion.moto}`,
      `Atención ${subData.id}: ${cotizacion.nombre} quiere ${cotizacion.moto}`,
      `${subData.id}, tienes trabajo: ${cotizacion.nombre} pide cotización`
    ];
    
    const messageIndex = parseInt(subData.id.slice(-1), 16) % customMessages.length;
    const personalizedBody = customMessages[messageIndex] || customMessages[0];
    
    return {
      title: `🏍️ Nueva Cotización - ${subData.id}`,
      body: personalizedBody,
      icon: '/cb190r.png',
      badge: '/cb190r.png',
      data: {
        url: '/',
        cotizacion: cotizacion,
        subscriptionId: subData.id,
        personalMessage: `Este mensaje es exclusivo para ${subData.id}`,
        timestamp: Date.now()
      },
      tag: `quotation-${cotizacion._id || Date.now()}`,
      requireInteraction: true
    };
  });
};

/**
 * Obtener la clave pública VAPID
 */
const getPublicKey = () => {
  return vapidKeys.publicKey;
};

/**
 * Eliminar suscripción por ID (legacy)
 */
const removeSubscription = (subscriptionId) => {
  const initialLength = subscriptions.length;
  subscriptions = subscriptions.filter(sub => sub.id !== subscriptionId);
  const removed = initialLength - subscriptions.length;
  
  if (removed > 0) {
    console.log(`🗑️ Suscripción eliminada: ${subscriptionId}`);
  }
  
  return removed > 0;
};

module.exports = {
  // ⭐ FUNCIÓN PRINCIPAL (NUEVA)
  sendNotificationToSubscription,
  
  // Funciones legacy (mantener para compatibilidad)
  addSubscription,
  getSubscriptions,
  getSubscriptionById,
  sendNotificationToAll,
  sendQuotationNotification,
  sendPersonalizedNotification,
  sendPersonalizedToAll,
  sendPersonalizedQuotationNotification,
  removeSubscription,
  getPublicKey
};