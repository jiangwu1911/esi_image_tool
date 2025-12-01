import React from 'react';
import './Toolbar.css';

function Toolbar({ onZoomIn, onZoomOut, onRotate, onPan, onReset, language }) {
  return (
    <div className="toolbar">
      <button 
        className="toolbar-btn" 
        onClick={onZoomIn}
        title="放大"
      >
        <span className="toolbar-icon">+</span>
      </button>
      
      <button 
        className="toolbar-btn" 
        onClick={onZoomOut}
        title="缩小"
      >
        <span className="toolbar-icon">-</span>
      </button>
      
      <button 
        className="toolbar-btn" 
        onClick={onRotate}
        title="旋转"
      >
        <span className="toolbar-icon">↻</span>
      </button>
      
      <button 
        className="toolbar-btn" 
        onClick={onPan}
        title="平移"
      >
        <span className="toolbar-icon">⇲</span>
      </button>
      
      <div className="toolbar-separator"></div>
      
      <button 
        className="toolbar-btn" 
        onClick={onReset}
        title="重置"
      >
        <span className="toolbar-icon">⟲</span>
      </button>
    </div>
  );
}

export default Toolbar;
