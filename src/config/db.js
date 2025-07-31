require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER || 'bbocardo',
    password: process.env.DB_PASSWORD || 'Bocardo246$',
    server: process.env.DB_SERVER || '192.168.6.10',
    database: process.env.DB_NAME || 'Intelisis',
    options: { encrypt: false, trustServerCertificate: true }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log(' ✅ Conectado a SQL Server');
        return pool;
    })
    .catch(err => {
        console.error(' ❌ Error al conectar con SQL Server:', err);
    });

module.exports = { sql, poolPromise };
