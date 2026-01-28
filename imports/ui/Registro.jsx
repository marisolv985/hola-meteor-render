import React, { useState } from 'react';
import AlertModal from '/imports/ui/AlertModal';

/* ---------- ICONO ---------- */
const Icon = ({ path }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="#6b7280"
    style={{
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)'
    }}
  >
    <path d={path} />
  </svg>
);

const icons = {
  nombre:
    'M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z',
  apellidos:
    'M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.7 0-8 1.3-8 4v3h10v-3c0-1.3 1.3-2.4 3-3-1-.6-3.1-1-5-1zm8 0c-.3 0-.6 0-.9.1 1.6.8 2.9 1.9 2.9 2.9v3h6v-3c0-2.7-5.3-4-8-4z',
  correo:
    'M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4-8 5-8-5',
  telefono:
    'M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011.1-.3 11.3 11.3 0 003.8.6v4c-7.7 0-14-6.3-14-14h4c0 1.3.2 2.6.6 3.8a1 1 0 01-.3 1.1l-2.2 2.2z',
  fecha:
    'M7 2v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2V2h-2v2H9V2z',
  archivo:
    'M16.5 6.5v8.8c0 2.1-1.6 3.7-3.7 3.7S9.1 17.4 9.1 15.3V6.1c0-1.3 1-2.3 2.3-2.3s2.3 1 2.3 2.3v7.6c0 .6-.5 1.1-1.1 1.1s-1.1-.5-1.1-1.1V6.5'
};

/* ---------- REGISTRO ---------- */
const Registro = () => {
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
    telefono: '',
    fecha: '',
    archivo: null
  });

  const [alertMessage, setAlertMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    /* ----- ARCHIVO ----- */
    if (name === 'archivo') {
      const file = files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        setAlertMessage('El archivo no debe superar 2 MB.');
        return;
      }

      setForm({ ...form, archivo: file });
      return;
    }

    /* ----- MÁXIMO 80 CARACTERES ----- */
    if (
      (name === 'nombre' || name === 'apellidos' || name === 'correo') &&
      value.length > 80
    ) {
      setAlertMessage(
        'Nombre, apellidos y correo tienen un máximo de 80 caracteres.'
      );
      return;
    }

    /* ----- SOLO LETRAS ----- */
    if (
      (name === 'nombre' || name === 'apellidos') &&
      !/^[a-zA-ZáéíóúÁÉÍÓÚ\s]*$/.test(value)
    ) {
      setAlertMessage('Nombre y apellidos solo pueden contener letras.');
      return;
    }

    /* ----- TELÉFONO ----- */
    if (name === 'telefono' && !/^\d*$/.test(value)) {
      setAlertMessage('El teléfono solo puede contener números.');
      return;
    }

    if (name === 'telefono' && value.length > 10) {
      setAlertMessage('El teléfono debe tener máximo 10 dígitos.');
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const enviar = (e) => {
    e.preventDefault();

    /* ----- CAMPOS VACÍOS ----- */
    for (const campo in form) {
      if (!form[campo]) {
        setAlertMessage('Todos los campos son obligatorios.');
        return;
      }
    }

    /* ----- VALIDACIÓN EXACTA DE TELÉFONO ----- */
    if (form.telefono.length !== 10) {
      setAlertMessage(
        'El número de teléfono debe contener exactamente 10 dígitos.'
      );
      return;
    }

    setAlertMessage('Formulario enviado correctamente.');
  };

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={enviar}>
        <h2 style={styles.title}>Registro de Usuario</h2>

        {['nombre', 'apellidos', 'correo', 'telefono', 'fecha'].map((campo) => (
          <div key={campo} style={styles.field}>
            <div style={styles.inputWrapper}>
              <Icon path={icons[campo]} />
              <input
                name={campo}
                type={
                  campo === 'correo'
                    ? 'email'
                    : campo === 'fecha'
                    ? 'date'
                    : 'text'
                }
                placeholder={campo.charAt(0).toUpperCase() + campo.slice(1)}
                value={form[campo]}
                onChange={handleChange}
                maxLength={
                  campo === 'nombre' ||
                  campo === 'apellidos' ||
                  campo === 'correo'
                    ? 80
                    : undefined
                }
                style={styles.input}
              />
            </div>
          </div>
        ))}

        {/* SUBIR ARCHIVO */}
        <div style={styles.field}>
          <div style={styles.inputWrapper}>
            <Icon path={icons.archivo} />
            <input
              type="file"
              name="archivo"
              accept="image/*,.pdf"
              onChange={handleChange}
              style={styles.input}
            />
          </div>
        </div>

        {/* BOTÓN ENVIAR */}
        <button style={styles.button}>Enviar</button>

        {/* BOTÓN IR A OTRA PÁGINA */}
        <button
          type="button"
          onClick={() => (window.location.pathname = '/otra-pagina')}
          style={styles.secondaryButton}
        >
          Ir a otra página (simulada error 404)
        </button>
      </form>

      <AlertModal
        message={alertMessage}
        onClose={() => setAlertMessage('')}
      />
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
  field: {
    marginBottom: '16px'
  },
  inputWrapper: {
    position: 'relative'
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 40px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
     boxSizing: 'border-box' 
  },
  button: {
    width: '100%',
    marginTop: '10px',
    padding: '14px',
    background: '#1f2937',
    color: '#f9fafb',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryButton: {
    width: '100%',
    marginTop: '12px',
    padding: '12px',
    background: '#e5e7eb',
    color: '#1f2937',
    border: '1px solid #9ca3af',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  }
};

export default Registro;
