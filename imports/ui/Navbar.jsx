import React, { useEffect, useState } from 'react';

const MAX_BREADCRUMBS = 3;

const routeMap = {
  '/': 'Inicio',
  '/registro': 'Registrar',
  '/otra-pagina': 'Otra página'
};

const Navbar = () => {
  const path = window.location.pathname;
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  /* ---------- NAVEGACIÓN ---------- */
  const go = (ruta) => {
    if (path !== ruta) {
      window.location.pathname = ruta;
    }
  };

  /* ---------- HISTORIAL DE BREADCRUMBS ---------- */
  useEffect(() => {
    const stored = JSON.parse(
      sessionStorage.getItem('breadcrumbs') || '[]'
    );

    const label = routeMap[path] || 'Página';

    // evita duplicados seguidos
    if (stored[stored.length - 1]?.path === path) {
      setBreadcrumbs(stored);
      return;
    }

    const updated = [...stored, { path, label }].slice(-MAX_BREADCRUMBS);

    sessionStorage.setItem('breadcrumbs', JSON.stringify(updated));
    setBreadcrumbs(updated);
  }, [path]);

  const buttonStyle = (active) => ({
    background: active ? '#374151' : 'transparent',
    color: active ? '#ffffff' : '#e5e7eb',
    border: '1px solid #6b7280',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all .2s ease'
  });

  return (
    <header style={styles.header}>
      {/* -------- FILA SUPERIOR -------- */}
      <div style={styles.topRow}>
        <span style={styles.title}>Hola Meteor</span>

        <nav style={styles.nav}>
          <button
            onClick={() => go('/')}
            style={buttonStyle(path === '/')}
          >
            Inicio
          </button>

          <button
            onClick={() => go('/registro')}
            style={buttonStyle(path === '/registro')}
          >
            Registrar
          </button>

          <button
            onClick={() => go('/otra-pagina')}
            style={buttonStyle(path === '/otra-pagina')}
          >
            Otra página
          </button>
        </nav>
      </div>

      {/* -------- BREADCRUMBS -------- */}
      <div style={styles.breadcrumbs}>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <span key={index}>
              <span
                onClick={() => !isLast && go(item.path)}
                style={{
                  cursor: isLast ? 'default' : 'pointer',
                  color: isLast ? '#ffffff' : '#e5e7eb',
                  fontWeight: isLast ? 600 : 400
                }}
              >
                {item.label}
              </span>

              {!isLast && (
                <span style={styles.separator}>/</span>
              )}
            </span>
          );
        })}
      </div>
    </header>
  );
};

/* ---------- ESTILOS ---------- */
const styles = {
  header: {
    background: '#1f2937',
    padding: '14px 40px',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial'
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    color: '#f9fafb',
    fontSize: '18px',
    fontWeight: 600
  },
  nav: {
    display: 'flex',
    gap: '10px'
  },
  breadcrumbs: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#e5e7eb'
  },
  separator: {
    margin: '0 6px',
    color: '#9ca3af'
  }
};

export default Navbar;
