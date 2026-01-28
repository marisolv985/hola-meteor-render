import React, { useState } from 'react';
import AlertModal from '/imports/ui/AlertModal';

const Carousel = () => {
  const [images, setImages] = useState([]);
  const [index, setIndex] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');

  /* ---------- SUBIR IMÁGENES ---------- */
  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newImages = files.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name
    }));

    setImages((prev) => [...prev, ...newImages]);
    setIndex(0);
    setAlertMessage('Imagen(es) subida(s) correctamente.');
  };

  /* ---------- NAVEGACIÓN ---------- */
  const prev = () => {
    setIndex((index + images.length - 1) % images.length);
  };

  const next = () => {
    setIndex((index + 1) % images.length);
  };

  /* ---------- ELIMINAR IMAGEN ---------- */
  const eliminarImagen = () => {
    const nuevas = images.filter((_, i) => i !== index);

    if (nuevas.length === 0) {
      setImages([]);
      setIndex(0);
    } else {
      setImages(nuevas);
      setIndex(index >= nuevas.length ? nuevas.length - 1 : index);
    }

    setAlertMessage('Imagen eliminada correctamente.');
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Carrusel de Imágenes</h3>

      {/* SUBIR IMÁGENES */}
      <label style={styles.upload}>
        📎 Agregar imágenes
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </label>

      {/* CONTENIDO */}
      {images.length > 0 ? (
        <>
          <div style={styles.imageWrapper}>
            <img
              src={images[index].url}
              alt={images[index].name}
              style={styles.image}
            />

            <button onClick={prev} style={{ ...styles.arrow, left: 12 }}>
              ‹
            </button>
            <button onClick={next} style={{ ...styles.arrow, right: 12 }}>
              ›
            </button>
          </div>

          <div style={styles.counter}>
            Imagen {index + 1} de {images.length}
          </div>

          {/* BOTÓN ELIMINAR */}
          <button onClick={eliminarImagen} style={styles.deleteButton}>
            Eliminar imagen
          </button>
        </>
      ) : (
        <div style={styles.placeholder}>
          Aún no se han cargado imágenes
        </div>
      )}

      {/* ALERTA BONITA */}
      <AlertModal
        message={alertMessage}
        onClose={() => setAlertMessage('')}
      />
    </div>
  );
};

/* ---------- ESTILOS ---------- */
const styles = {
  card: {
    marginBottom: '24px',
    padding: '20px',
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial'
  },
  title: {
    marginBottom: '14px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    textAlign: 'center'
  },
  upload: {
    display: 'inline-block',
    marginBottom: '14px',
    padding: '8px 16px',
    border: '1px solid #9ca3af',
    borderRadius: '6px',
    background: '#f9fafb',
    color: '#1f2937',
    fontSize: '14px',
    cursor: 'pointer'
  },
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '8px'
  },
  image: {
    width: '100%',
    height: '220px',
    objectFit: 'cover'
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(31,41,55,0.75)',
    color: '#f9fafb',
    border: 'none',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  counter: {
    marginTop: '10px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#374151'
  },
  deleteButton: {
    marginTop: '12px',
    width: '100%',
    padding: '10px',
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  placeholder: {
    height: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed #9ca3af',
    borderRadius: '8px',
    color: '#6b7280',
    fontSize: '14px'
  }
};

export default Carousel;
