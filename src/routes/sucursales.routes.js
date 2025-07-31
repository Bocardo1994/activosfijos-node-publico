const express = require('express');
const router = express.Router();
const verifyToken = require('../config/auth');
const { getSucursales } = require('../controllers/sucursales.controller');

router.get('/', verifyToken, getSucursales);

module.exports = router;
