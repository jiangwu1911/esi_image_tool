// TransformInfo.js
import React from 'react';

const TransformInfo = ({ transform, isPanning, language = 'en' }) => {
  const translations = {
    en: {
      zoom: 'Zoom: ',
      rotation: 'Rotation: ',
      panning: 'Panning Mode (Space to exit)'
    },
    zh: {
      zoom: '缩放: ',
      rotation: '旋转: ',
      panning: '平移模式 (空格键退出)'
    }
  };

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;

  return (
    <div className="transform-info">
      <span style={{ color: 'white', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>
        {t('zoom')}{transform.scale.toFixed(2)}x
      </span>
      <span style={{ color: 'white', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>
        {t('rotation')}{transform.rotation}°
      </span>
      {isPanning && (
        <span style={{ color: '#ff6b6b', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          {t('panning')}
        </span>
      )}
    </div>
  );
};

export default TransformInfo;
