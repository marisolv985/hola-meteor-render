import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query(`
  CREATE TABLE IF NOT EXISTS registros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(70),
    apellido VARCHAR(70),
    correo VARCHAR(100),
    telefono VARCHAR(10),
    fecha DATE
  );
`).then(() => {
  console.log("Tabla lista en producción");
}).catch(err => {
  console.error("Error creando tabla", err);
});