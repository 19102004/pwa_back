const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");

// Registrar usuario
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await Usuario.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const newUser = new Usuario({ username, password });
    await newUser.save();

    res.json({ message: "Usuario registrado", username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Usuario.findOne({ username });

    if (!user) return res.status(400).json({ message: "Usuario no encontrado" });

    if (user.password !== password)
      return res.status(400).json({ message: "Contraseña incorrecta" });

    res.json({ message: "Login exitoso", username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error en el login" });
  }
});

module.exports = router;
