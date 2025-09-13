import express from "express";

const app = express();
const PORT = process.env.PORT || 4000;

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 Servidor funcionando con Express");
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
    