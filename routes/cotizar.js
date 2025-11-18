// routes/cotizar.js
const express = require('express');
const Cotizacion = require('../models/Cotizar');
const pushService = require('../services/pushService'); 

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

    // 🔔 Enviar notificación push a todos los suscriptores
    try {
      await pushService.sendQuotationNotification({
        nombre: nuevaCotizacion.nombre,
        telefono: nuevaCotizacion.telefono,
        moto: nuevaCotizacion.moto,
        _id: nuevaCotizacion._id
      });
      console.log('📤 Notificación push enviada para la cotización');
    } catch (pushError) {
      console.error('⚠ Error enviando notificación push:', pushError);
      // No fallar la petición si falla la notificación
    }

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
// =========================================
// ⭐ NUEVO: 🧪 Endpoint de prueba para notificaciones personalizadas
// =========================================
router.post('/test-notification', async (req, res) => {
  try {
    const cotizacionPrueba = {
      _id: 'test-' + Date.now(),
      nombre: 'Cliente de Prueba',
      telefono: '1234567890',
      moto: 'Honda CBR Test'
    };
    
    const result = await pushService.sendPersonalizedQuotationNotification(cotizacionPrueba);
    
    res.json({
      success: true,
      message: 'Notificaciones personalizadas de prueba enviadas',
      stats: {
        successful: result.successful,
        failed: result.failed,
        total: result.successful + result.failed
      }
    });
  } catch (error) {
    console.error('❌ Error en prueba de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificaciones de prueba',
      error: error.message
    });
  }
});

// =========================================
// 🗑️ Eliminar una cotización
// =========================================
router.delete('/:id', async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findByIdAndDelete(req.params.id);
    
    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: 'Cotización no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Cotización eliminada correctamente',
      cotizacion
    });
  } catch (error) {
    console.error('❌ Error al eliminar cotización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la cotización'
    });
  }
});


module.exports = router;