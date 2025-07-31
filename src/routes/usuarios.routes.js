const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/usuarios.controller');

router.post('/registro', register);
router.post('/login', login);

module.exports = router;
