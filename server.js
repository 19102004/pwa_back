// server.js
require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cotizarRoutes = require('./routes/cotizar');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(
  cors({
    origin: "http://localhost:4173", 
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

// Conexión a MongoDB Atlas
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch((err) => console.error('❌ Error al conectar a MongoDB:', err));

// Ruta base
app.get('/', (req, res) => {
  res.send('🚀 Servidor funcionando correctamente');
});

// Ruta de cotizaciones
app.use('/cotizacion', cotizarRoutes);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor corriendo en http://localhost:${PORT}`);
});
