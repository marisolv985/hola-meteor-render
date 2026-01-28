import React from 'react';

const AlertModal = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>Confirmación</h3>
        <p style={styles.text}>{message}</p>
        <button onClick={onClose} style={styles.button}>
          Aceptar
        </button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
  modal: {
    background: '#ffffff',
    padding: '32px',
    width: '360px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 15px 40px rgba(0,0,0,0.25)',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial'
  },
  title: {
    marginBottom: '10px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827'
  },
  text: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '24px'
  },
  button: {
    padding: '10px 22px',
    background: '#1f2937',
    color: '#f9fafb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600
  }
};

export default AlertModal;
