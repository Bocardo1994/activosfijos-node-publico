const express = require('express');
const router = express.Router();
const verifyToken = require('../config/auth');
const { getActivos, getActivoByBarcode, obtenerDetalleActivoCompleto} = require('../controllers/activos.controller');

// 📌 Ruta para obtener activos por sucursal y filtros
router.get('/', verifyToken, getActivos);

// 📌 Nueva ruta para obtener activo por código de barras
router.get('/barcode/:barcode', verifyToken, getActivoByBarcode);

router.get('/detalle/:referencia/:sucursal', obtenerDetalleActivoCompleto);


module.exports = router;

