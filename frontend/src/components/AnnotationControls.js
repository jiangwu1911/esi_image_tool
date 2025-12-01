import React from 'react';

const AnnotationControls = ({ 
  selectedTool, 
  onToolSelect, 
  lineWidth, 
  onLineWidthChange, 
  color, 
  onColorChange,
  language = 'en'
}) => {
  // 翻译函数
  const t = (key) => {
    const translations = {
      en: {
        'tools.title': 'Annotation Tools',
        'tools.shapes': 'Shapes',
        'tools.rectangle': 'Rectangle',
        'tools.circle': 'Circle',
        'tools.ellipse': 'Ellipse',
        'tools.select': 'Select/Move',
        'tools.lineWidth': 'Line Width',
        'tools.color': 'Color',
        'tools.instructions': 'Instructions',
        'tools.instruction1': 'Select shape tools to draw on the image',
        'tools.instruction2': 'Select "Select/Move" tool to select and move annotations',
        'tools.instruction3': 'Click annotation to select, drag to move position',
        'tools.instruction4': 'Press Delete key to delete selected annotation',
        'tools.instruction5': 'Press ESC key to cancel selection',
        'tools.instruction6': 'Annotations need at least 5 pixels to be created',
        'color.red': 'Red',
        'color.blue': 'Blue',
        'color.green': 'Green',
        'color.yellow': 'Yellow',
        'color.purple': 'Purple',
        'color.orange': 'Orange',
      },
      zh: {
        'tools.title': '标注工具',
        'tools.shapes': '形状',
        'tools.rectangle': '矩形',
        'tools.circle': '圆形',
        'tools.ellipse': '椭圆',
        'tools.select': '选择/移动',
        'tools.lineWidth': '线宽',
        'tools.color': '颜色',
        'tools.instructions': '使用说明',
        'tools.instruction1': '选择形状工具在图像上绘制',
        'tools.instruction2': '选择"选择/移动"工具来选择和移动标注',
        'tools.instruction3': '点击标注选中，拖动移动位置',
        'tools.instruction4': '按Delete键删除选中的标注',
        'tools.instruction5': '按ESC键取消选择',
        'tools.instruction6': '标注需要至少5像素大小才能创建',
        'color.red': '红色',
        'color.blue': '蓝色',
        'color.green': '绿色',
        'color.yellow': '黄色',
        'color.purple': '紫色',
        'color.orange': '橙色',
      }
    };
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const tools = [
    { type: 'rectangle', label: t('tools.rectangle'), icon: '⬜' },
    { type: 'circle', label: t('tools.circle'), icon: '⭕' },
    { type: 'ellipse', label: t('tools.ellipse'), icon: '🔘' },
    { type: 'select', label: t('tools.select'), icon: '↔️' }
  ];

  const colors = [
    { value: 'red', label: t('color.red') },
    { value: 'blue', label: t('color.blue') },
    { value: 'green', label: t('color.green') },
    { value: 'yellow', label: t('color.yellow') },
    { value: 'purple', label: t('color.purple') },
    { value: 'orange', label: t('color.orange') }
  ];

  const lineWidths = [1, 2, 3, 4, 5];

  return (
    <div className="annotation-controls">
      <h3>{t('tools.title')}</h3>
      
      <div className="controls-content">
        {/* 工具选择 */}
        <div className="tools-section">
          <h4>{t('tools.shapes')}</h4>
          <div className="tool-buttons">
            {tools.map(tool => (
              <button
                key={tool.type}
                onClick={() => onToolSelect(tool.type)}
                className={`tool-btn ${selectedTool === tool.type ? 'active' : ''}`}
                title={tool.label}
              >
                <span className="tool-icon">{tool.icon}</span>
                <span className="tool-label">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 线宽选择 */}
        <div className="control-section">
          <h4>{t('tools.lineWidth')}</h4>
          <div className="line-width-buttons">
            {lineWidths.map(width => (
              <button
                key={width}
                onClick={() => onLineWidthChange(width)}
                className={`width-btn ${lineWidth === width ? 'active' : ''}`}
                title={`${width}px`}
              >
                <div 
                  className="width-preview" 
                  style={{ height: `${width}px`, backgroundColor: color }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* 颜色选择 */}
        <div className="control-section">
          <h4>{t('tools.color')}</h4>
          <div className="color-buttons">
            {colors.map(colorOption => (
              <button
                key={colorOption.value}
                onClick={() => onColorChange(colorOption.value)}
                className={`color-btn ${color === colorOption.value ? 'active' : ''}`}
                title={colorOption.label}
              >
                <div 
                  className="color-preview" 
                  style={{ backgroundColor: colorOption.value }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="instructions">
          <h4>{t('tools.instructions')}</h4>
          <ul>
            <li>{t('tools.instruction1')}</li>
            <li>{t('tools.instruction2')}</li>
            <li>{t('tools.instruction3')}</li>
            <li>{t('tools.instruction4')}</li>
            <li>{t('tools.instruction5')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnnotationControls;
