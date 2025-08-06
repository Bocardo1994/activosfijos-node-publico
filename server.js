const app = require('./src/app'); // ✅ Importa `app.js`
const port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log(`✅ Servidor corriendo n en http://Localhost:${port}`);
});
