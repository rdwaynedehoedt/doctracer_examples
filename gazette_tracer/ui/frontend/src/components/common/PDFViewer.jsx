import React, { useEffect } from 'react';
import './PDFViewer.css';

const PDFViewer = ({ url, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="pdf-overlay" onClick={onClose}>
      <div className="pdf-container" onClick={(e) => e.stopPropagation()}>
        <button className="pdf-close-button" onClick={onClose}>×</button>
        <iframe 
          src={url} 
          title="Gazette PDF Viewer"
          className="pdf-frame"
        />
      </div>
    </div>
  );
};

export default PDFViewer; 