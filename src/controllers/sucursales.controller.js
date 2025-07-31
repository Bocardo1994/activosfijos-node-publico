const { sql, poolPromise } = require('../config/db');

const getSucursales = async (req, res) => {
    const { Rol, Tienda } = req.user; // Extraer rol y sucursal del token JWT

    console.log("🔹 Rol del usuario:", Rol);
    console.log("🔹 Sucursal del usuario:", Tienda);

    try {
        const pool = await poolPromise;
        let query = `
            SELECT S.Sucursal AS SucursalID, S.NOMBRE AS NombreSucursal, S.Categoria 
            FROM sucursal S 
            JOIN SUCURSALACTIVA SA ON S.Sucursal = SA.SUCURSAL 
            WHERE S.Estatus = 'ALTA' 
        `;

        if (Rol === 'lider') {
            query += ` AND S.Categoria = (SELECT TOP 1 Categoria FROM sucursal WHERE Sucursal = @SucursalID)`;
        } else if (Rol !== 'admin') {
            query += " AND S.Sucursal = @SucursalID";
        }

        console.log("🔍 Consulta ejecutada:", query);

        const result = await pool.request()
            .input('SucursalID', sql.Int, Tienda)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "No se encontraron sucursales para este usuario." });
        }

        console.log("✅ Resultado de la consulta:", result.recordset);

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('❌ Error al obtener las sucursales:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener sucursales.', 
            error: err.message 
        });
    }
};

module.exports = { getSucursales };

