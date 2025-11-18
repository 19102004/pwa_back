require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const cotizarRoutes = require('./routes/cotizar');
const usuarioRoutes = require('./routes/usuario'); 
const pushRoutes = require('./routes/push'); 

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ CORS configurado para localhost y Vercel
app.use(cors({
  origin: [
    "http://localhost:4173",
    "https://pwa-front-virid.vercel.app"
  ],
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

// Necesario para preflight
// app.options('*', cors());

// Middleware
app.use(express.json());

// MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Rutas principales
app.use('/cotizacion', cotizarRoutes);
app.use('/usuario', usuarioRoutes); 
app.use('/push', pushRoutes); 

// Ruta base
app.get('/', (req, res) => {
  res.send('🚀 Servidor funcionando correctamente');
});

// Servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});
