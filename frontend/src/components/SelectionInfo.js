// SelectionInfo.js
import React from 'react';

const SelectionInfo = ({ selectedAnnotation, language = 'en' }) => {
  if (!selectedAnnotation) return null;

  const translations = {
    en: {
      selected: 'Selected: ',
      instructions: ' (Drag to move, Delete to remove, ESC to cancel)'
    },
    zh: {
      selected: '已选中：',
      instructions: ' (拖动移动，Delete删除，ESC取消)'
    }
  };

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;

  return (
    <div className="selection-info">
      <span style={{ color: 'white', fontSize: '14px' }}>
        {t('selected')}{selectedAnnotation.label}{t('instructions')}
      </span>
    </div>
  );
};

export default SelectionInfo;
