const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  admin: { 
    type: String, 
    default: 'no' 
  },
  // ⭐ NUEVO: Guardar suscripción de notificaciones push
  pushSubscription: {
    subscriptionId: { type: String },
    endpoint: { type: String },
    keys: {
      p256dh: { type: String },
      auth: { type: String }
    },
    subscribedAt: { type: Date }
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Usuario', usuarioSchema);