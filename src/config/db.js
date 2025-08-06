require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log(' ✅ Conectado a SQL Server');
        return pool;
    })
    .catch(err => {
        console.error(' ❌ Error al conectar con SQL Server:', err);
        throw err; // 🚨 Lanzamos el error para que poolPromise no sea undefined
    });

module.exports = { sql, poolPromise };
