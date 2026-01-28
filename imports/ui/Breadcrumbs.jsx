import React from 'react';

const Breadcrumbs = () => {
  const path = window.location.pathname;

  const breadcrumbMap = {
    '/': 'Inicio',
    '/registro': 'Registro',
    '/otra-pagina': 'Otra página'
  };

  const current = breadcrumbMap[path] || 'Página';

  const goHome = () => {
    if (path !== '/') {
      window.location.pathname = '/';
    }
  };

  return (
    <div style={styles.container}>
      {/* INICIO */}
      <span
        onClick={goHome}
        style={{
          ...styles.link,
          ...(path === '/' ? styles.active : {})
        }}
      >
        Inicio
      </span>

      {/* SEPARADOR Y PÁGINA ACTUAL */}
      {path !== '/' && (
        <>
          <span style={styles.separator}>/</span>
          <span style={styles.current}>{current}</span>
        </>
      )}
    </div>
  );
};

/* ---------- ESTILOS ---------- */
const styles = {
  container: {
    maxWidth: '480px',
    margin: '16px auto',
    padding: '8px 4px',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial',
    fontSize: '13px',
    color: '#6b7280'
  },
  link: {
    cursor: 'pointer',
    color: '#374151'
  },
  separator: {
    margin: '0 6px',
    color: '#9ca3af'
  },
  current: {
    color: '#111827',
    fontWeight: 600
  },
  active: {
    fontWeight: 600,
    color: '#111827',
    cursor: 'default'
  }
};

export default Breadcrumbs;
