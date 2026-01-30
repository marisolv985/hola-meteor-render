import React, { useState } from 'react';

/* ---------- ICONOS SVG (CORREGIDOS) ---------- */
const Icon = ({ children }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#4b5563"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)'
    }}
  >
    {children}
  </svg>
);

const icons = {
  nombre: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0113 0" />
    </>
  ),
  apellido: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0113 0" />
    </>
  ),
  correo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  telefono: (
    <>
      <path d="M22 16.92V21a2 2 0 01-2.18 2A19.8 19.8 0 013 5.18 2 2 0 015 3h4l2 5-2.5 2.5" />
    </>
  ),
  fecha: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  )
};

const Registro = () => {
  const hoy = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    fecha: ''
  });

  const [errors, setErrors] = useState({});
  const [mensaje, setMensaje] = useState('');

  /* ---------- VALIDACIONES (NO TOCADAS) ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    let error = '';

    if (name === 'nombre' || name === 'apellido') {
      if (value.length > 70) {
        error = 'Máximo 70 caracteres.';
        setErrors({ ...errors, [name]: error });
        return;
      }
      if (value.includes(' ')) {
        error = 'No se permiten espacios.';
        setErrors({ ...errors, [name]: error });
        return;
      }
      if (!/^[A-Za-z]*$/.test(value)) {
        error = 'Solo se permiten letras.';
        setErrors({ ...errors, [name]: error });
        return;
      }
    }

    if (name === 'telefono') {
      if (value.length > 70) {
        error = 'Máximo 70 caracteres.';
        setErrors({ ...errors, [name]: error });
        return;
      }
      if (!/^\d*$/.test(value)) {
        error = 'Solo se permiten números.';
        setErrors({ ...errors, [name]: error });
        return;
      }
      if (value.length > 10) {
        error = 'Máximo 10 dígitos.';
        setErrors({ ...errors, [name]: error });
        return;
      }
    }

    if (name === 'fecha' && value > hoy) {
      error = 'La fecha de nacimiento no puede ser futura.';
      setErrors({ ...errors, [name]: error });
      return;
    }

    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  /* ---------- ENVIAR ---------- */
  const enviar = (e) => {
    e.preventDefault();
    const e2 = {};

    if (!form.nombre) e2.nombre = 'El nombre es obligatorio.';
    if (!form.apellido) e2.apellido = 'El apellido es obligatorio.';
    if (!form.correo) e2.correo = 'El correo es obligatorio.';
    if (form.telefono.length !== 10)
      e2.telefono = 'Debe contener exactamente 10 números.';
    if (!form.fecha)
      e2.fecha = 'La fecha de nacimiento es obligatoria.';

    if (Object.keys(e2).length > 0) {
      setErrors(e2);
      return;
    }

    /* ✅ ENVÍO CORRECTO */
    setForm({
      nombre: '',
      apellido: '',
      correo: '',
      telefono: '',
      fecha: ''
    });
    setErrors({});
    setMensaje('Datos enviados correctamente.');
  };

  const labels = {
    nombre: 'Nombre',
    apellido: 'Apellido',
    correo: 'Correo',
    telefono: 'Teléfono',
    fecha: 'Fecha de nacimiento'
  };

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={enviar}>
        <h2 style={styles.title}>Registro de Usuario</h2>

        {Object.keys(form).map((campo) => (
          <div key={campo} style={styles.field}>
            <label style={styles.label}>{labels[campo]}</label>

            <div style={styles.inputWrapper}>
              <Icon>{icons[campo]}</Icon>
              <input
                type={
                  campo === 'correo'
                    ? 'email'
                    : campo === 'fecha'
                    ? 'date'
                    : 'text'
                }
                name={campo}
                value={form[campo]}
                max={campo === 'fecha' ? hoy : undefined}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            {errors[campo] && (
              <p style={styles.error}>{errors[campo]}</p>
            )}
          </div>
        ))}

        <button style={styles.button}>Enviar</button>

        {mensaje && (
          <p style={{ marginTop: '14px', color: '#065f46', textAlign: 'center' }}>
            {mensaje}
          </p>
        )}
      </form>
    </div>
  );
};

/* ---------- ESTILOS ---------- */
const styles = {
  page: {
    minHeight: 'calc(100vh - 70px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f3f4f6',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial'
  },
  card: {
    background: '#ffffff',
    padding: '36px',
    width: '420px',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
  },
  title: {
    textAlign: 'center',
    marginBottom: '24px',
    color: '#111827',
    fontWeight: 600
  },
  label: {
    color: '#374151',
    fontSize: '13px',
    marginBottom: '4px',
    display: 'block'
  },
  field: {
    marginBottom: '14px'
  },
  inputWrapper: {
    position: 'relative'
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 44px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  error: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px'
  },
  button: {
    width: '100%',
    marginTop: '16px',
    padding: '14px',
    background: '#1f2937',
    color: '#f9fafb',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer'
  }
};

export default Registro;
