import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ReCAPTCHA from 'react-google-recaptcha';
import { Meteor } from 'meteor/meteor';

/* ---------- ESTILOS ---------- */
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f4f6f8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "San Francisco", "Helvetica Neue", Helvetica, Arial, sans-serif'
  },
  card: {
    background: '#fff',
    padding: '32px',
    borderRadius: '14px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 18px 40px rgba(0,0,0,0.14)'
  },
  title: {
    textAlign: 'center',
    marginBottom: '6px',
    fontWeight: '600',
    fontSize: '24px'
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: '26px',
    fontSize: '14px'
  },
  field: {
    marginBottom: '18px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    display: 'block',
    letterSpacing: '0.3px',
    color: '#374151'
  },
  inputWrapper: {
    position: 'relative'
  },
  icon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '18px',
    height: '18px',
    fill: '#6b7280'
  },
  input: {
    width: '100%',
    padding: '13px 14px 13px 42px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    background: '#fff',
    boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.1)',
    outline: 'none',
    transition: 'all .25s ease'
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'transform .15s ease, box-shadow .15s ease',
    boxShadow: '0 8px 18px rgba(79,70,229,.4)'
  },
  success: {
    color: '#15803d',
    marginTop: '10px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '14px'
  }
};

/* ---------- ICONOS SVG ---------- */
const UserIcon = () => (
  <svg viewBox="0 0 24 24" style={styles.icon}>
    <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
  </svg>
);

const AgeIcon = () => (
  <svg viewBox="0 0 24 24" style={styles.icon}>
    <path d="M12 2c.6 0 1 .4 1 1v2h-2V3c0-.6.4-1 1-1zm6 6H6c-1.1 0-2 .9-2 2v10h16V10c0-1.1-.9-2-2-2z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" style={styles.icon}>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

/* ---------- 404 ---------- */
const NotFound = () => (
  <div style={styles.page}>
    <div style={styles.card}>
      <h1 style={{ fontSize: '64px', textAlign: 'center' }}>404</h1>
      <p style={{ textAlign: 'center', color: '#6b7280' }}>
        La página que buscas no existe.
      </p>
      <button
        style={styles.button}
        onClick={() => (window.location.href = '/')}
      >
        Volver al inicio
      </button>
    </div>
  </div>
);

/* ---------- APP ---------- */
const App = () => {
  if (window.location.pathname !== '/') return <NotFound />;

  const [verified, setVerified] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    edad: '',
    correo: '',
    telefono: '',
    fecha: ''
  });

  const onCaptchaChange = (value) => {
    Meteor.call('verifyRecaptcha', value, (_, res) => {
      if (res?.success) setVerified(true);
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'nombre' && !/^[a-zA-ZáéíóúÁÉÍÓÚ\s]*$/.test(value)) return;
    if ((name === 'edad' || name === 'telefono') && !/^\d*$/.test(value)) return;
    if (name === 'telefono' && value.length > 10) return;

    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!verified) return alert('Verifica el reCAPTCHA');
    window.location.href = '/form-enviado';
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Hola mundo</h1>
        <p style={styles.subtitle}>Marisol González Villa</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Nombre</label>
            <div style={styles.inputWrapper}>
              <UserIcon />
              <input style={styles.input} name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Edad</label>
            <div style={styles.inputWrapper}>
              <AgeIcon />
              <input style={styles.input} name="edad" value={form.edad} onChange={handleChange} required />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Correo</label>
            <div style={styles.inputWrapper}>
              <MailIcon />
              <input style={styles.input} type="email" name="correo" value={form.correo} onChange={handleChange} required />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Teléfono</label>
            <input
              style={{ ...styles.input, paddingLeft: '14px' }}
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Fecha</label>
            <input
              style={{ ...styles.input, paddingLeft: '14px' }}
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              required
            />
          </div>

          <ReCAPTCHA
            sitekey="6Lf11kksAAAAAPt3x7ooW5_9BcGTWB9Prg_7h-Fn"
            onChange={onCaptchaChange}
          />

          {verified && <p style={styles.success}>✔ Captcha verificado</p>}

          <button style={styles.button} type="submit">
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

/* ---------- START ---------- */
Meteor.startup(() => {
  createRoot(document.getElementById('react-target')).render(<App />);
});
