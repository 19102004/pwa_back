// models/Cotizar.js
const mongoose = require('mongoose');

const cotizacionSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  telefono: { type: String, required: true, trim: true },
  moto: { type: String, required: true, trim: true },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cotizacion', cotizacionSchema, 'cotizacion');
