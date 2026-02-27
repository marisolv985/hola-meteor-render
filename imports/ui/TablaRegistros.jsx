import React, { useEffect, useState } from "react";
import { Meteor } from "meteor/meteor";

const TablaRegistros = () => {

  const [registros, setRegistros] = useState([]);
  const [search, setSearch] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editando, setEditando] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [toast, setToast] = useState(null);

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

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const eliminar = (id) => {
    setEliminando(id);
  };

  const confirmarEliminar = () => {
    Meteor.call("eliminarRegistro", eliminando, (err) => {
      if (err) {
        showToast("Error al eliminar", "error");
      } else {
        showToast("Usuario eliminado correctamente");
        cargarDatos();
      }
      setEliminando(null);
    });
  };

  const guardarEdicion = () => {
    Meteor.call(
      "actualizarRegistro",
      editando.id,
      {
        nombre: editando.nombre,
        apellido: editando.apellido,
        correo: editando.correo,
        telefono: editando.telefono,
        fecha: editando.fecha
      },
      (err) => {
        if (err) {
          showToast("Error al actualizar", "error");
        } else {
          showToast("Usuario actualizado correctamente");
          cargarDatos();
        }
        setEditando(null);
      }
    );
  };

  const limpiar = () => {
    setSearch("");
    setDesde("");
    setHasta("");
    setPage(1);
  };

  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleDateString("es-MX");

  return (
    <div style={styles.wrapper}>

      <h1 style={styles.title}>Gestión de Usuarios</h1>

      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === "error" ? "#dc2626" : "#111827"
          }}
        >
          {toast.message}
        </div>
      )}

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
              <th>Nombre</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Fecha de nacimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {registros.map(r => (
              <tr key={r.id} style={styles.row}>
                <td style={styles.nombre}>{r.nombre} {r.apellido}</td>
                <td>{r.correo}</td>
                <td>{r.telefono}</td>
                <td>{formatearFecha(r.fecha)}</td>
                <td style={styles.actionsCell}>
                  <span
                    style={styles.iconEdit}
                    onClick={() => setEditando(r)}
                  >
                    ✏️
                  </span>

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

      {/* MODAL EDITAR */}
      {editando && (
        <div style={styles.overlay}>
          <div style={styles.modalContent}>
            <h3>Editar Usuario</h3>

            <input
              style={styles.modalInput}
              value={editando.nombre}
              onChange={e => setEditando({ ...editando, nombre: e.target.value })}
            />
            <input
              style={styles.modalInput}
              value={editando.apellido}
              onChange={e => setEditando({ ...editando, apellido: e.target.value })}
            />
            <input
              style={styles.modalInput}
              value={editando.correo}
              onChange={e => setEditando({ ...editando, correo: e.target.value })}
            />
            <input
              style={styles.modalInput}
              value={editando.telefono}
              onChange={e => setEditando({ ...editando, telefono: e.target.value })}
            />
            <input
              style={styles.modalInput}
              type="date"
              value={new Date(editando.fecha).toISOString().split("T")[0]}
              onChange={e => setEditando({ ...editando, fecha: e.target.value })}
            />

            <div style={styles.modalActions}>
              <button style={styles.btnPrimary} onClick={guardarEdicion}>
                Guardar
              </button>
              <button style={styles.btnSecondary} onClick={() => setEditando(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {eliminando && (
        <div style={styles.overlay}>
          <div style={styles.modalDelete}>
            <h3>¿Eliminar usuario?</h3>
            <p>Esta acción no se puede deshacer.</p>

            <div style={styles.modalActions}>
              <button style={styles.btnDelete} onClick={confirmarEliminar}>
                Sí, eliminar
              </button>
              <button
                style={styles.btnSecondary}
                onClick={() => setEliminando(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ===================== */
/* ESTILOS */
/* ===================== */

const styles = {

  wrapper: {
    padding: 40,
    background: "#f5f7fa",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },

  title: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 30,
    textAlign: "center"
  },

  filtroCard: {
    background: "#ffffff",
    padding: 20,
    borderRadius: 16,
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
    marginBottom: 25,
    display: "flex",
    flexDirection: "column",
    gap: 15
  },

  search: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #e5e7eb"
  },

  rango: {
    display: "flex",
    gap: 20
  },

  fechaBox: {
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },

  fechaLabel: {
    fontSize: 13,
    marginBottom: 5,
    color: "#6b7280"
  },

  dateInput: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #e5e7eb"
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 15
  },

  btnClear: {
    background: "#e5e7eb",
    border: "none",
    padding: "10px 18px",
    borderRadius: 8,
    cursor: "pointer"
  },

  btnNuevo: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer"
  },

  tableContainer: {
    background: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  row: {
    borderBottom: "1px solid #f1f5f9"
  },

  nombre: {
    fontWeight: 600
  },

  actionsCell: {
    display: "flex",
    gap: 15,
    alignItems: "center"
  },

  iconEdit: {
    cursor: "pointer",
    fontSize: 18
  },

  iconDelete: {
    cursor: "pointer",
    fontSize: 18,
    color: "#dc2626"
  },

  pagination: {
    padding: 20,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
    borderTop: "1px solid #f1f5f9"
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  modalContent: {
    background: "#ffffff",
    padding: 35,
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    gap: 15,
    minWidth: 380,
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)"
  },

  modalDelete: {
    background: "#fff",
    padding: 30,
    borderRadius: 16,
    width: 320,
    textAlign: "center"
  },

  modalInput: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    fontSize: 15
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10
  },

  btnPrimary: {
    background: "#22c55e",
    border: "none",
    padding: "10px 20px",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer"
  },

  btnSecondary: {
    background: "#e5e7eb",
    border: "none",
    padding: "10px 20px",
    borderRadius: 12,
    cursor: "pointer"
  },

  btnDelete: {
    background: "#dc2626",
    border: "none",
    padding: "10px 20px",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer"
  },

  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    color: "#fff",
    padding: "12px 18px",
    borderRadius: 8,
    fontWeight: 500,
    boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
  }

};

export default TablaRegistros;