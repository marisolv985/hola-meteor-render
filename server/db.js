import pkg from 'pg';
const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        user: 'postgres',
        host: 'localhost',
        database: 'meteorapp',
        password: '12345',
        port: 5432
      }
);

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
  console.log("Tabla lista");
}).catch(err => {
  console.error("Error creando tabla", err);
});