// LoadingOverlay.js
import React from 'react';

const LoadingOverlay = ({ show, language = 'en' }) => {
  if (!show) return null;

  const text = language === 'zh' ? '加载图像中...' : 'Loading image...';

  return (
    <div className="loading-overlay">
      {text}
    </div>
  );
};

export default LoadingOverlay;
