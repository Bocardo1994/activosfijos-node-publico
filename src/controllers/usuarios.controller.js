const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../config/db');
const SECRET_KEY = process.env.SECRET_KEY || 'clave_secreta_segura';

// 🔹 REGISTRAR USUARIO (ADAPTADO)
const register = async (req, res) => {
    const { Usuario, Contrasena, Nombre, Tienda, Rol } = req.body;

    if (!Usuario || !Contrasena || !Tienda) {
        return res.status(400).json({ success: false, message: 'Usuario, Contraseña y Sucursal son requeridos.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(Contrasena, 10);
        const pool = await poolPromise;

        await pool.request()
            .input('Usuario_AF', sql.NVarChar, Usuario)
            .input('Contrasena_AF', sql.NVarChar, hashedPassword)
            .input('Nombre_AF', sql.NVarChar, Nombre || '')
            .input('Sucursal_AF', sql.Int, Tienda)
            .input('Rol_AF', sql.NVarChar, Rol || 'usuario')
            .query(`
                INSERT INTO Usuario_AF (Usuario_AF, Contrasena_AF, Nombre_AF, Sucursal_AF, Rol_AF)
                VALUES (@Usuario_AF, @Contrasena_AF, @Nombre_AF, @Sucursal_AF, @Rol_AF)
            `);

        res.json({ success: true, message: 'Usuario registrado exitosamente.' });
    } catch (err) {
        console.error("❌ Error al registrar usuario:", err);
        res.status(500).json({ success: false, message: 'Error al registrar usuario.', error: err.message });
    }
};

// 🔹 INICIO DE SESIÓN (ADAPTADO)
const login = async (req, res) => {
    const { Usuario, Contrasena } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Usuario_AF', sql.NVarChar, Usuario)
            .query(`
                SELECT NumeroEmpleado_AF, Usuario_AF, Contrasena_AF, Nombre_AF, Sucursal_AF, Rol_AF
                FROM Usuario_AF
                WHERE Usuario_AF = @Usuario_AF
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const user = result.recordset[0];

        const passwordMatch = await bcrypt.compare(Contrasena, user.Contrasena_AF);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        const token = jwt.sign(
            {
                NumeroEmpleado: user.NumeroEmpleado_AF,
                Usuario: user.Usuario_AF,
                Nombre: user.Nombre_AF,
                Tienda: user.Sucursal_AF,
                Rol: user.Rol_AF
            },
            SECRET_KEY,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: {
                NumeroEmpleado: user.NumeroEmpleado_AF,
                Usuario: user.Usuario_AF,
                Nombre: user.Nombre_AF,
                Tienda: user.Sucursal_AF,
                Rol: user.Rol_AF
            }
        });
    } catch (err) {
        console.error("❌ Error en el inicio de sesión:", err);
        res.status(500).json({ success: false, message: 'Error en inicio de sesión.', error: err.message });
    }
};

module.exports = { register, login };

