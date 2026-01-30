import React, { useState, useEffect } from 'react';

const Carousel = () => {
  const [images, setImages] = useState(() => {
    const saved = localStorage.getItem('carouselImages');
    return saved ? JSON.parse(saved) : [];
  });
  const [index, setIndex] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState(''); // error | success

  /* ---------- PERSISTENCIA ---------- */
  useEffect(() => {
    localStorage.setItem('carouselImages', JSON.stringify(images));
  }, [images]);

  /* ---------- SUBIR IMÁGENES ---------- */
  const handleUpload = (e) => {
    const files = Array.from(e.target.files);

    if (!files.every(file => file.type.startsWith('image/'))) {
      setAlertType('error');
      setAlertMessage('⚠️ Solo se permiten archivos de imagen (JPG, PNG, etc.)');
      e.target.value = '';
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, { url: reader.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });

    setAlertType('success');
    setAlertMessage('✅ Imagen(es) subida(s) correctamente.');
    setIndex(0);
  };

  /* ---------- NAVEGACIÓN ---------- */
  const prev = () => setIndex((index + images.length - 1) % images.length);
  const next = () => setIndex((index + 1) % images.length);

  /* ---------- ELIMINAR ---------- */
  const eliminar = () => {
    const nuevas = images.filter((_, i) => i !== index);
    setImages(nuevas);
    setIndex(0);
    setAlertType('success');
    setAlertMessage('🗑️ Imagen eliminada correctamente.');
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Carrusel de Imágenes</h3>

      {/* BOTÓN SUBIR */}
      <label style={styles.upload}>
        📷 Agregar imágenes
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </label>

      {/* 🔴🟢 ALERTA JUSTO DESPUÉS DEL BOTÓN */}
      {alertMessage && (
        <button
          type="button"
          onClick={() => setAlertMessage('')}
          style={
            alertType === 'error'
              ? styles.alertButtonError
              : styles.alertButtonSuccess
          }
        >
          {alertMessage} &nbsp; ✖
        </button>
      )}

      {/* CONTENIDO */}
      {images.length > 0 ? (
        <>
          <div style={styles.imageWrapper}>
            <img
              src={images[index].url}
              alt=""
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

          <button onClick={eliminar} style={styles.delete}>
            Eliminar imagen
          </button>
        </>
      ) : (
        <div style={styles.placeholder}>
          Aún no se han cargado imágenes
        </div>
      )}
    </div>
  );
};

/* ---------- ESTILOS ---------- */
const styles = {
  card: {
    marginBottom: '28px',
    padding: '22px',
    background: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial'
  },
  title: {
    textAlign: 'center',
    marginBottom: '14px',
    fontSize: '17px',
    fontWeight: 600,
    color: '#111827'
  },
  upload: {
    display: 'block',
    margin: '0 auto 12px',
    padding: '10px 18px',
    border: '1px solid #9ca3af',
    borderRadius: '6px',
    background: '#f9fafb',
    color: '#1f2937',
    fontSize: '14px',
    cursor: 'pointer',
    width: 'fit-content'
  },

  /* ALERTAS TIPO BOTÓN */
  alertButtonError: {
    width: '100%',
    marginBottom: '14px',
    padding: '12px',
    background: '#fee2e2',
    border: '1px solid #dc2626',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center'
  },
  alertButtonSuccess: {
    width: '100%',
    marginBottom: '14px',
    padding: '12px',
    background: '#dcfce7',
    border: '1px solid #16a34a',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center'
  },

  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '10px'
  },
  image: {
    width: '100%',
    height: '240px',
    objectFit: 'cover'
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(31,41,55,0.8)',
    color: '#f9fafb',
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    fontSize: '22px',
    cursor: 'pointer'
  },
  counter: {
    marginTop: '10px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#374151'
  },
  delete: {
    marginTop: '12px',
    width: '100%',
    padding: '10px',
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  placeholder: {
    height: '240px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed #9ca3af',
    borderRadius: '10px',
    color: '#6b7280',
    fontSize: '14px'
  }
};

export default Carousel;
