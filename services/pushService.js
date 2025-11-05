// services/pushService.js
const webpush = require('web-push');
const path = require('path');
const fs = require('fs');

// Leer claves VAPID desde el archivo JSON (NUNCA desde .env)
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

// Array para almacenar las suscripciones (en producción usar base de datos)
let subscriptions = [];

/**
 * Agregar una nueva suscripción
 * @param {Object} subscription 
 */
const addSubscription = (subscription) => {
  // Evitar duplicados
  const exists = subscriptions.some(
    sub => JSON.stringify(sub) === JSON.stringify(subscription)
  );
  
  if (!exists) {
    subscriptions.push(subscription);
    console.log('✅ Nueva suscripción agregada:', subscription.endpoint);
  }
  
  return subscriptions.length;
};

/**
 * Obtener todas las suscripciones
 */
const getSubscriptions = () => {
  return subscriptions;
};

/**
 * Enviar notificación a todas las suscripciones
 * @param {Object} payload 
 */
const sendNotificationToAll = async (payload) => {
  const notificationPayload = JSON.stringify(payload);
  
  console.log(`📤 Enviando notificación a ${subscriptions.length} suscriptores...`);
  
  const promises = subscriptions.map(async (subscription, index) => {
    try {
      await webpush.sendNotification(subscription, notificationPayload);
      console.log(`✅ Notificación enviada a suscriptor ${index + 1}`);
    } catch (error) {
      console.error(`❌ Error enviando notificación a suscriptor ${index + 1}:`, error.message);
      
      // Si el endpoint ya no es válido (410 Gone), eliminar la suscripción
      if (error.statusCode === 410) {
        subscriptions = subscriptions.filter(sub => sub !== subscription);
        console.log('🗑️ Suscripción inválida eliminada');
      }
    }
  });
  
  await Promise.allSettled(promises);
};

/**
 * Enviar notificación de nueva cotización
 * @param {Object} cotizacion - Datos de la cotización
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
 * Obtener la clave pública VAPID para el cliente
 */
const getPublicKey = () => {
  return vapidKeys.publicKey;
};

module.exports = {
  addSubscription,
  getSubscriptions,
  sendNotificationToAll,
  sendQuotationNotification,
  getPublicKey
};

