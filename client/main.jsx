import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { createRoot } from 'react-dom/client';
import ReCAPTCHA from 'react-google-recaptcha';

import Navbar from '/imports/ui/Navbar';
import Carousel from '/imports/ui/Carousel';
import Registro from '/imports/ui/Registro';
import NotFound from '/imports/ui/NotFound';
import AlertModal from '/imports/ui/AlertModal';

/* ---------- APP ---------- */
const App = () => {
  const path = window.location.pathname;

  const [verified, setVerified] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [enviado, setEnviado] = useState(false);

  const onCaptchaChange = (value) => {
    Meteor.call('verifyRecaptcha', value, (_, res) => {
      if (res?.success) setVerified(true);
    });
  };

  const enviarHome = () => {
    if (!verified) {
      setAlertMessage('Por favor, verifica el reCAPTCHA antes de continuar.');
      return;
    }

    setAlertMessage('Los datos se enviaron correctamente.');
    setEnviado(true);
  };

  const irARegistro = () => {
    window.location.pathname = '/registro';
  };

  return (
    <>
      <Navbar />

      {/* ---------- HOME ---------- */}
      {path === '/' && (
        <div style={styles.homeCard}>
          <Carousel />

          <ReCAPTCHA
            sitekey="6Lf11kksAAAAAPt3x7ooW5_9BcGTWB9Prg_7h-Fn"
            onChange={onCaptchaChange}
          />

          {/* BOTÓN DINÁMICO */}
          {!enviado ? (
            <button
              onClick={enviarHome}
              style={styles.primaryButton}
            >
              Enviar
            </button>
          ) : (
            <button
              onClick={irARegistro}
              style={styles.registerButton}
            >
              Ir a registrarse
            </button>
          )}

          {/* BOTÓN IR A OTRA PÁGINA */}
          <button
            onClick={() => (window.location.pathname = '/otra-pagina')}
            style={styles.secondaryButton}
          >
            Ir a otra página(simulada error 404)
          </button>
        </div>
      )}

      {/* ---------- REGISTRO ---------- */}
      {path === '/registro' && <Registro />}

      {/* ---------- NOT FOUND ---------- */}
      {path !== '/' && path !== '/registro' && <NotFound />}

      {/* ---------- ALERTA BONITA ---------- */}
      <AlertModal
  message={alertMessage}
  onClose={() => {
    if (alertMessage === 'Los datos se enviaron correctamente.') {
      setEnviado(true);
    }
    setAlertMessage('');
  }}
/>

    </>
  );
};

/* ---------- ESTILOS ---------- */
const styles = {
  homeCard: {
    maxWidth: '480px',
    margin: '60px auto',
    padding: '32px',
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial'
  },
  primaryButton: {
    width: '100%',
    marginTop: '20px',
    padding: '14px',
    background: '#1f2937',
    color: '#f9fafb',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  registerButton: {
    width: '100%',
    marginTop: '20px',
    padding: '14px',
    background: '#2563eb', // azul para diferenciar
    color: '#ffffff',
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

/* ---------- START ---------- */
Meteor.startup(() => {
  createRoot(document.getElementById('react-target')).render(<App />);
});
