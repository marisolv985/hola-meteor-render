import { Meteor } from 'meteor/meteor';
import { pool } from './db.js';
const fetch = require('node-fetch');

Meteor.methods({

  async verifyRecaptcha(token) {
    const secretKey = "TU_SECRET_KEY";

    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${token}`
      }
    );

    return await response.json();
  },

  async crearRegistro(data) {
  console.log("🔥 crearRegistro ejecutado", data);

  const { nombre, apellido, correo, telefono, fecha } = data;

  const result = await pool.query(
    `INSERT INTO registros (nombre, apellido, correo, telefono, fecha)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [nombre, apellido, correo, telefono, fecha]
  );

  return result.rows[0];
},

  async obtenerRegistros({ search = '', desde = null, hasta = null, page = 1, limit = 5 }) {

  const offset = (page - 1) * limit;
  const values = [];
  let where = [];
  let index = 1;

  if (search) {
    where.push(`(
      LOWER(nombre) LIKE LOWER($${index})
      OR LOWER(correo) LIKE LOWER($${index})
      OR telefono LIKE $${index}
    )`);
    values.push(`%${search}%`);
    index++;
  }

  if (desde) {
    where.push(`fecha >= $${index}`);
    values.push(desde);
    index++;
  }

  if (hasta) {
    where.push(`fecha <= $${index}`);
    values.push(hasta);
    index++;
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalResult = await pool.query(
    `SELECT COUNT(*) FROM registros ${whereClause}`,
    values
  );

  const result = await pool.query(
    `SELECT * FROM registros
     ${whereClause}
     ORDER BY id DESC
     LIMIT $${index} OFFSET $${index + 1}`,
    [...values, limit, offset]
  );

  return {
    data: result.rows,
    total: parseInt(totalResult.rows[0].count)
  };
},

 async actualizarRegistro(id, data) {

  console.log("🔥 EDITANDO ID:", id);
  console.log("🔥 DATA:", data);

  if (!id) {
    throw new Meteor.Error("ID inválido");
  }

  const { nombre, apellido, correo, telefono, fecha } = data;

  const result = await pool.query(
    `UPDATE registros
     SET nombre=$1,
         apellido=$2,
         correo=$3,
         telefono=$4,
         fecha=$5
     WHERE id=$6
     RETURNING *`,
    [
      nombre,
      apellido,
      correo,
      telefono,
      fecha,
      Number(id) // 🔥 FORZAMOS A NÚMERO
    ]
  );

  if (result.rows.length === 0) {
    throw new Meteor.Error("No se encontró el registro para actualizar");
  }

  return result.rows[0];
},

async eliminarRegistro(id) {
    if (!id) {
      throw new Meteor.Error("ID inválido");
    }

    await pool.query(
      `DELETE FROM registros WHERE id=$1`,
      [id]
    );

    return true;
  },

});