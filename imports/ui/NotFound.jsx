import React from 'react';

const NotFound = () => {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>404</h1>
      <h2>Página no encontrada</h2>
      <p>Esta ruta no existe.</p>

      <a href="/">Volver al inicio</a>
    </div>
  );
};

export default NotFound;
