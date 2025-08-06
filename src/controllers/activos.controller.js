const { sql, poolPromise } = require('../config/db');

const getActivos = async (req, res) => {
    const { limit = 10, offset = 1, sucursalID, query } = req.query;

    if (!sucursalID) {
        return res.status(400).json({ success: false, message: 'SucursalID requerido' });
    }

    try {
        const pool = await poolPromise;
        let sqlQuery = `
            WITH ActivosPaginados AS (
                SELECT 
                    Referencia, Articulo, Sucursal, Categoria, Serie, Almacen, 
                    AdquisicionValor, AdquisicionFecha, VidaUtil, GarantiaVence,
                    ROW_NUMBER() OVER (ORDER BY Referencia) AS RowNum
                FROM activof
                WHERE Empresa = 'OMSA' AND ESTATUS = 'ACTIVO'
                AND CATEGORIA IN ('Equipo de Tienda', 'Equipo de Transporte', 'Equipo de Cómputo')
                AND referencia IS NOT NULL
                AND Sucursal = @SucursalID
        `;

        // Si hay búsqueda, agregar filtro
        if (query) {
            sqlQuery += " AND (Referencia LIKE @Query OR Articulo LIKE @Query)";
        }

        sqlQuery += `)
        SELECT Referencia, Articulo, Sucursal, Categoria, Serie, Almacen, 
               AdquisicionValor, AdquisicionFecha, VidaUtil, GarantiaVence
        FROM ActivosPaginados
        WHERE RowNum BETWEEN (@Offset - 1) * @Limit + 1 AND @Offset * @Limit;`;

        const request = pool.request()
            .input('SucursalID', sql.Int, sucursalID)
            .input('Limit', sql.Int, parseInt(limit))
            .input('Offset', sql.Int, parseInt(offset));

        if (query) {
            request.input('Query', sql.NVarChar, `%${query}%`);
        }

        const result = await request.query(sqlQuery);

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error al obtener los activos:', err);
        res.status(500).json({ success: false, message: 'Error al obtener los activos.', error: err.message });
    }
};

// 📌 FUNCIÓN PARA OBTENER ACTIVO POR CÓDIGO DE BARRAS
const getActivoByBarcode = async (req, res) => {
    const { barcode } = req.params;

    if (!barcode) {
        return res.status(400).json({ success: false, message: 'Código de barras requerido' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Barcode', sql.NVarChar, barcode)
            .query(`
                SELECT Referencia, Articulo, Sucursal, Categoria, Serie, Almacen, 
                       AdquisicionValor, AdquisicionFecha, VidaUtil, GarantiaVence
                FROM activof
                WHERE Referencia = @Barcode
            `);

        if (result.recordset.length > 0) {
            res.json({ success: true, data: result.recordset[0] });
        } else {
            res.status(404).json({ success: false, message: 'Activo no encontrado' });
        }
    } catch (err) {
        console.error('Error al buscar activo por código de barras:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const obtenerDetalleActivoCompleto = async (req, res) => {
  const { referencia, sucursal } = req.params;

  try {
    const pool = await poolPromise;
  if (!pool) throw new Error("Conexión no establecida con la base de datos.");


    // 1️⃣ Obtener datos del activo
    const activoResult = await pool.request()
      .input('Referencia', sql.NVarChar, referencia)
      .input('Sucursal', sql.Int, sucursal)
      .query(`
        SELECT TOP 1 *
        FROM activof
        WHERE Referencia = @Referencia AND Sucursal = @Sucursal AND Empresa = 'OMSA'
      `);

    const activo = activoResult.recordset[0];
    if (!activo) return res.status(404).json({ error: "Activo no encontrado." });

    // 2️⃣ Obtener gastos relacionados
    const gastoResult = await pool.request()
      .input('Referencia', sql.NVarChar, referencia)
      .query(`SELECT * FROM Gasto WHERE IDmerco = @Referencia and estatus = 'CONCLUIDO'
        `);

    const gastos = gastoResult.recordset;

    // 3️⃣ Obtener detalles por ID de gasto
    const gastoIDs = gastos.map(g => g.ID);
    let detalles = [];
    if (gastoIDs.length > 0) {
      const idsCSV = gastoIDs.join(",");
      const detalleResult = await pool.request().query(`
        SELECT * FROM GastoD WHERE ID IN (${idsCSV})
      `);
      detalles = detalleResult.recordset;
    }

    // 4️⃣ Construir gastos con detalles agrupados
    const gastosConDetalle = gastos.map(g => {
    const fecha = new Date(g.FechaEmision);
    const mes = fecha.toLocaleString('es-MX', { month: 'long' }); // ✅ ya definido antes de usarlo
    const anio = fecha.getFullYear();

    return {
      id: g.ID,
      fecha: g.FechaEmision,
      mes,            // ✅ ahora sí funciona
      anio,
      concepto: g.Mov,
      importe: g.Importe,
      comentarios: g.Comentarios,
      detalles: detalles.filter(d => d.ID === g.ID).map(d => ({
        renglon: d.Renglon,
        concepto: d.Concepto,
        cantidad: d.Cantidad,
        precio: d.Precio,
        importe: d.Importe,
        descripcionExtra: d.DescripcionExtra
      }))
    };
  });


    // 5️⃣ Calcular métricas clave
    const adquisicion = parseFloat(activo.AdquisicionValorF || 0);
    const desecho = parseFloat(activo.ValorDesecho || 0);
    const depAcum = parseFloat(activo.DepreciacionAcumF || 0);
    const vidaUtil = parseInt(activo.VidaUtilF || activo.VidaUtil || 0);
    const depMeses = parseInt(activo.DepreciacionMesesF || activo.DepreciacionMeses || 0);
    let mantenimientoAcum = 0;
    let reparacionAcum = 0;

    gastos.forEach(g => {
      const conceptoLower = (g.Mov || "").toLowerCase();
      if (conceptoLower.includes("preventivo")) {
        mantenimientoAcum += parseFloat(g.Importe || 0);
      } else if (conceptoLower.includes("correctivo")) {
        reparacionAcum += parseFloat(g.Importe || 0);
      }
    });

    const costoMantto = mantenimientoAcum + reparacionAcum;



    const valorLibroActual = adquisicion - depAcum;
    const costoPorUso = activo.Utilizacion ? (costoMantto / parseFloat(activo.Utilizacion)) : null;

    const metricas = {
      valorLibroActual,
      vidaUtilRestanteMeses: vidaUtil - depMeses,
      costoTotalMantenimiento: costoMantto,
      costoPorUso,
      depreciacionMensual: vidaUtil ? ((adquisicion - desecho) / vidaUtil) : null,
      porcentajeVidaUtilConsumida: vidaUtil ? ((depMeses / vidaUtil) * 100) : null,
      gastoVsValor: adquisicion ? ((costoMantto / adquisicion) * 100) : null
    };

    // 6️⃣ Enviar respuesta final
    res.json({
      activo,
      mantenimientos: gastosConDetalle
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) // orden descendente por fecha
        .map(g => ({
          fechaUltimo: g.fecha,
          mes: new Date(g.fecha).toLocaleString('es-MX', { month: 'long' }),
          fechaSiguiente: activo.MantenimientoSiguiente,
          periodicidad: activo.MantenimientoPeriodicidad,
          responsable: activo.Responsable,
          tipo: "Correctivo", // o "Preventivo" si tienes forma de diferenciarlo
          observaciones: g.comentarios
        })),
      gastos: gastosConDetalle,
      metricas
    });


  } catch (error) {
    console.error("❌ Error al obtener detalle completo:", error);
    res.status(500).json({ error: "Error interno al obtener detalle del activo." });
  }
};


// 📌 EXPORTAMOS FUNCIONES
module.exports = {
    getActivos,
    getActivoByBarcode,
    obtenerDetalleActivoCompleto
};
