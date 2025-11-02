require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Importa tus rutas
const cotizarRoutes = require('./routes/cotizar');
const usuarioRoutes = require('./routes/usuario'); // 👈 Mantenido

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: "http://localhost:4173",
  methods: ["GET", "POST"],
}));
app.use(bodyParser.json());

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Rutas principales
app.use('/cotizacion', cotizarRoutes);
app.use('/usuario', usuarioRoutes); // 👈 Mantenido

app.get('/', (req, res) => {
  res.send('🚀 Servidor funcionando correctamente');
});

// Servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor corriendo en http://localhost:${PORT}`);
});
