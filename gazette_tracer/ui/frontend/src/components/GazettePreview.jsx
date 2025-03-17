import React from 'react';
import './GazettePreview.css';

const GazettePreview = ({ gazette }) => {
  if (!gazette) {
    return (
      <div className="gazette-preview empty">
        Select a Gazette to view details
      </div>
    );
  }

  return (
    <div className="gazette-preview">
      <h3>Gazette Details</h3>
      
      <div className="preview-field">
        <label>Date</label>
        <div className="field-value">{gazette.date}</div>
      </div>

      <div className="preview-field">
        <label>Name</label>
        <div className="field-value">{gazette.name}</div>
      </div>

      <div className="preview-field">
        <label>Description</label>
        <div className="field-value">{gazette.description}</div>
      </div>

      <div className="preview-field">
        <label>Gazette ID</label>
        <div className="field-value">{gazette.gazette_id}</div>
      </div>

      <div className="preview-field">
        <label>URL</label>
        <a 
          href={gazette.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="gazette-link"
        >
          View Gazette Document
        </a>
      </div>
    </div>
  );
};

export default GazettePreview; 