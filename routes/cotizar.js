// routes/cotizar.js
const express = require('express');
const Cotizacion = require('../models/Cotizar');

const router = express.Router();

// =========================================
// 📩 Crear nueva cotización
// =========================================
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono, moto } = req.body;

    if (!nombre || !telefono || !moto) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios'
      });
    }

    const nuevaCotizacion = await Cotizacion.create({ nombre, telefono, moto });
    console.log("✅ Cotización creada:", nuevaCotizacion);

    res.status(201).json({
      success: true,
      message: 'Cotización guardada correctamente',
      cotizacion: nuevaCotizacion
    });
  } catch (error) {
    console.error('❌ Error creando cotización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar la cotización'
    });
  }
});

// =========================================
// 📋 Obtener todas las cotizaciones
// =========================================
router.get('/', async (req, res) => {
  try {
    const cotizaciones = await Cotizacion.find().sort({ fecha: -1 });
    res.status(200).json({ success: true, cotizaciones });
  } catch (error) {
    console.error('❌ Error obteniendo cotizaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las cotizaciones'
    });
  }
});

// =========================================
// 🔍 Obtener una cotización por ID
// =========================================
router.get('/:id', async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findById(req.params.id);

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: 'Cotización no encontrada'
      });
    }

    res.json({ success: true, cotizacion });
  } catch (error) {
    console.error('❌ Error obteniendo cotización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la cotización'
    });
  }
});

module.exports = router;
