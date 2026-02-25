import React, { useEffect, useState } from "react";
import { Meteor } from "meteor/meteor";

const TablaRegistros = () => {

  const [registros, setRegistros] = useState([]);
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 5;
  const totalPages = Math.ceil(total / limit);

  const cargarDatos = () => {
    Meteor.call("obtenerRegistros", {
      search,
      desde,
      hasta,
      page,
      limit
    }, (err, res) => {
      if (!err && res) {
        setRegistros(res.data);
        setTotal(res.total);
      }
    });
  };

  useEffect(() => {
    cargarDatos();
  }, [search, desde, hasta, page]);

  const eliminar = (id) => {
    Meteor.call("eliminarRegistro", id, () => {
      cargarDatos();
    });
  };

  const limpiar = () => {
    setSearch("");
    setDesde("");
    setHasta("");
    setPage(1);
  };

  const formatearFecha = (fecha) => {
    const f = new Date(fecha);
    return f.toLocaleDateString("es-MX"); // 31/12/2026
  };

  return (
  <div style={styles.wrapper}>

    <h1 style={styles.title}>Gestión de Usuarios</h1>

      {/* FILTROS */}
      <div style={styles.filtroCard}>
        <input
          placeholder="Buscar por palabra clave (Nombre, Correo, Teléfono)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.search}
        />

        <div style={styles.rango}>
  <div style={styles.fechaBox}>
    <label style={styles.fechaLabel}>Desde fecha</label>
    <input
      type="date"
      value={desde}
      onChange={e => setDesde(e.target.value)}
      style={styles.dateInput}
    />
  </div>

  <div style={styles.fechaBox}>
    <label style={styles.fechaLabel}>Hasta fecha</label>
    <input
      type="date"
      value={hasta}
      onChange={e => setHasta(e.target.value)}
      style={styles.dateInput}
    />
  </div>
</div>

        <div style={styles.actions}>
          <button onClick={limpiar} style={styles.btnClear}>
            Limpiar
          </button>

          <button
            style={styles.btnNuevo}
            onClick={() => window.location.pathname = "/registro"}
          >
            + NUEVO
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Nombre ↑</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Fecha de nacimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {registros.map(r => (
              <tr key={r.id}>
                <td style={styles.nombre}>
                  {r.nombre} {r.apellido}
                </td>

                <td>{r.correo}</td>

                <td>{r.telefono}</td>

                <td>{formatearFecha(r.fecha)}</td>

                <td>
                  <span style={styles.iconEdit}>✏️</span>
                  <span
                    style={styles.iconDelete}
                    onClick={() => eliminar(r.id)}
                  >
                    🗑️
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINADO */}
        <div style={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(1)}>«</button>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>

          <span>Página {page} de {totalPages || 1}</span>

          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
          <button disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>
    </div>
  );
};

const styles = {

  wrapper: {
    padding: 30,
    background: "#f3f4f6",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  },
  title: {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 30,
  color: "#1f2937",
  letterSpacing: "-0.5px",
  textAlign: "center"
},

  filtroCard: {
    background: "#ffffff",
    padding: 20,
    borderRadius: 16,
    boxShadow: "0 6px 15px rgba(0,0,0,0.08)",
    marginBottom: 25,
    display: "flex",
    flexDirection: "column",
    gap: 15
  },

  search: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14
  },

  rango: {
    display: "flex",
    gap: 15
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 15
  },

  btnClear: {
    background: "#e5e7eb",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 500
  },

  btnNuevo: {
    background: "#22c55e",
    color: "white",
    border: "none",
    padding: "10px 22px",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer"
  },

  tableContainer: {
    background: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 6px 15px rgba(0,0,0,0.08)"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  nombre: {
    fontWeight: 600
  },

  iconEdit: {
    marginRight: 10,
    cursor: "pointer"
  },

  iconDelete: {
    cursor: "pointer",
    color: "#ef4444"
  },

  fechaBox: {
  display: "flex",
  flexDirection: "column",
  flex: 1
},

fechaLabel: {
  fontSize: 13,
  marginBottom: 6,
  color: "#6b7280",
  fontWeight: 500
},

dateInput: {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14
},

  pagination: {
    padding: 15,
    display: "flex",
    justifyContent: "center",
    gap: 12,
    borderTop: "1px solid #e5e7eb"
  }
};

export default TablaRegistros;