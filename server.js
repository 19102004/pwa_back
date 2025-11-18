require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const cotizarRoutes = require('./routes/cotizar');
const usuarioRoutes = require('./routes/usuario'); 
const pushRoutes = require('./routes/push'); 

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Middleware para manejar CORS manualmente (más control)
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:4173',
    'https://pwa-front-virid.vercel.app'
  ];
  
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware para parsear JSON
app.use(express.json());

// MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get('origin')}`);
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
    endpoints: ['/cotizacion', '/usuario', '/push']
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Ruta no encontrada' 
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
  console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 CORS habilitado para:`);
  console.log(`   - http://localhost:4173`);
  console.log(`   - https://pwa-front-virid.vercel.app`);
});