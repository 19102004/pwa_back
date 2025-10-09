// models/Cotizar.js
const mongoose = require('mongoose');

const cotizacionSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  telefono: { type: String, required: true, trim: true },
  moto: { type: String, required: true, trim: true },
  fecha: { type: Date, default: Date.now }
});

// Esto automáticamente crea la colección "cotizacions" (plural de cotizacion)
// Puedes forzar el nombre así: mongoose.model('Cotizacion', cotizacionSchema, 'cotizacion');
module.exports = mongoose.model('Cotizacion', cotizacionSchema, 'cotizacion');
