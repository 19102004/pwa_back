require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const cotizarRoutes = require('./routes/cotizar');
const usuarioRoutes = require('./routes/usuario'); 
const pushRoutes = require('./routes/push'); 

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Middleware CORS SIMPLIFICADO (esto es clave)
const allowedOrigins = [
  'http://localhost:4173',
  'https://pwa-front-virid.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como Postman, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ Origen bloqueado por CORS:', origin);
      callback(null, true); // ⭐ Permitir de todos modos para debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// ⭐ Middleware para parsear JSON (DEBE ir DESPUÉS de CORS)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// ⭐ Middleware de logging MEJORADO
app.use((req, res, next) => {
  console.log('\n' + '='.repeat(60));
  console.log(`📥 ${req.method} ${req.path}`);
  console.log(`🌍 Origin: ${req.get('origin') || 'No origin'}`);
  console.log(`📦 Content-Type: ${req.get('content-type') || 'No content-type'}`);
  
  if (req.method === 'POST' && req.body) {
    console.log(`📄 Body:`, JSON.stringify(req.body, null, 2));
  }
  
  console.log('='.repeat(60) + '\n');
  next();
});

// Rutas principales
app.use('/cotizacion', cotizarRoutes);
app.use('/usuario', usuarioRoutes); 
app.use('/push', pushRoutes); 

// Ruta base
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Servidor funcionando correctamente',
    cors: 'enabled',
    endpoints: ['/cotizacion', '/usuario', '/push'],
    allowedOrigins
  });
});

// ⭐ Endpoint de prueba para cotizaciones
app.post('/test-cotizacion', (req, res) => {
  console.log('🧪 Test endpoint - Body recibido:', req.body);
  res.json({
    success: true,
    message: 'Test exitoso',
    received: req.body
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  console.log('❌ Ruta no encontrada:', req.method, req.path);
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Servidor
app.listen(PORT, () => {
  console.log(`\n${'🔥'.repeat(30)}`);
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 CORS habilitado para:`);
  allowedOrigins.forEach(origin => console.log(`   ✅ ${origin}`));
  console.log(`🔗 MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
  console.log(`${'🔥'.repeat(30)}\n`);
});