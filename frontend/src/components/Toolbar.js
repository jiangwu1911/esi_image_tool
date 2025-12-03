// Toolbar.js
import React from 'react';
import './Toolbar.css';

function Toolbar({ onZoomIn, onZoomOut, onRotate, onPan, onReset, language, isPanning = false }) {
  // 翻译函数
  const t = (key) => {
    const translations = {
      en: {
        'zoomIn': 'Zoom In (Ctrl+=)',
        'zoomOut': 'Zoom Out (Ctrl+-)',
        'rotate': 'Rotate 90°',
        'pan': isPanning ? 'Stop Panning (Space)' : 'Start Panning (Space)',
        'reset': 'Reset View (Ctrl+0)',
      },
      zh: {
        'zoomIn': '放大 (Ctrl+=)',
        'zoomOut': '缩小 (Ctrl+-)',
        'rotate': '旋转 90°',
        'pan': isPanning ? '停止平移 (空格键)' : '开始平移 (空格键)',
        'reset': '重置视图 (Ctrl+0)',
      }
    };
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <div className="toolbar">
      <button 
        className="toolbar-btn" 
        onClick={onZoomIn}
        title={t('zoomIn')}
      >
        <span className="toolbar-icon" style={{ color: 'white' }}>+</span>
      </button>
      
      <button 
        className="toolbar-btn" 
        onClick={onZoomOut}
        title={t('zoomOut')}
      >
        <span className="toolbar-icon" style={{ color: 'white' }}>-</span>
      </button>
      
      <button 
        className="toolbar-btn" 
        onClick={onRotate}
        title={t('rotate')}
      >
        <span className="toolbar-icon" style={{ color: 'white' }}>↻</span>
      </button>
      
      <button 
        className={`toolbar-btn ${isPanning ? 'active' : ''}`}
        onClick={onPan}
        title={t('pan')}
      >
        <span className="toolbar-icon" style={{ color: 'white' }}>⇲</span>
      </button>
      
      <div className="toolbar-separator"></div>
      
      <button 
        className="toolbar-btn" 
        onClick={onReset}
        title={t('reset')}
      >
        <span className="toolbar-icon" style={{ color: 'white' }}>⟲</span>
      </button>
    </div>
  );
}

export default Toolbar;
