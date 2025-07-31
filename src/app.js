const express = require('express'); // ✅ Importa Express
const cors = require('cors'); // ✅ Importa CORS

const app = express(); // ✅ Declara la app antes de usarla

app.use(express.json());
app.use(cors());

// Importar rutas
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/activos', require('./routes/activos.routes'));
app.use('/api/sucursales', require('./routes/sucursales.routes'));

module.exports = app; // ✅ Exporta app para que `server.js` la use
