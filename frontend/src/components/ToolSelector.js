// ToolSelector.js - 替换旧的AnnotationControls.js
import React from 'react';

const ToolSelector = ({ 
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
        'tools.spline': 'Spline ROI',
        'tools.freehand': 'Freehand ROI',
        'tools.select': 'Select/Move',
        'tools.lineWidth': 'Line Width',
        'tools.color': 'Color',
        'tools.instructions': 'Instructions',
        'tools.instruction1': 'Select shape tools to draw on the image',
        'tools.instruction2': 'Select "Select/Move" tool to select and move annotations',
        'tools.instruction3': 'Click annotation to select, drag to move position',
        'tools.instruction4': 'Press Delete key to delete selected annotation',
        'tools.instruction5': 'Press ESC key to cancel selection',
        'tools.instructionSpline': 'Spline: Click to add points, double-click or press Enter to finish',
        'tools.instructionFreehand': 'Freehand: Click and drag to draw, release to finish',
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
        'tools.spline': '样条曲线ROI',
        'tools.freehand': '自由手绘ROI',
        'tools.select': '选择/移动',
        'tools.lineWidth': '线宽',
        'tools.color': '颜色',
        'tools.instructions': '使用说明',
        'tools.instruction1': '选择形状工具在图像上绘制',
        'tools.instruction2': '选择"选择/移动"工具来选择和移动标注',
        'tools.instruction3': '点击标注选中，拖动移动位置',
        'tools.instruction4': '按Delete键删除选中的标注',
        'tools.instruction5': '按ESC键取消选择',
        'tools.instructionSpline': '样条曲线：点击添加点，双击或按Enter完成',
        'tools.instructionFreehand': '自由手绘：点击并拖动绘制，松开完成',
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
    { type: 'select', label: t('tools.select'), icon: '↔️' },
    { type: 'rectangle', label: t('tools.rectangle'), icon: '⬜' },
    { type: 'circle', label: t('tools.circle'), icon: '⭕' },
    { type: 'ellipse', label: t('tools.ellipse'), icon: '🔘' },
    { type: 'spline', label: t('tools.spline'), icon: '〰️' },
    { type: 'freehand', label: t('tools.freehand'), icon: '✏️' }
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
    <div className="annotation-controls" style={{
      backgroundColor: '#233143',
      borderRadius: '8px',
      padding: '16px',
      color: 'white',
      minWidth: '250px'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{t('tools.title')}</h3>
      
      {/* 工具选择 */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>{t('tools.shapes')}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {tools.map(tool => (
            <button
              key={tool.type}
              onClick={() => onToolSelect(tool.type)}
              className={selectedTool === tool.type ? 'active' : ''}
              title={tool.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px',
                backgroundColor: selectedTool === tool.type ? 'rgba(0, 123, 255, 0.3)' : '#2c3e50',
                border: `1px solid ${selectedTool === tool.type ? '#007bff' : '#3a506b'}`,
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '20px', marginBottom: '4px' }}>{tool.icon}</span>
              <span style={{ fontSize: '11px' }}>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 线宽选择 */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>{t('tools.lineWidth')}</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {lineWidths.map(width => (
            <button
              key={width}
              onClick={() => onLineWidthChange(width)}
              className={lineWidth === width ? 'active' : ''}
              title={`${width}px`}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: lineWidth === width ? 'rgba(0, 123, 255, 0.3)' : '#2c3e50',
                border: `1px solid ${lineWidth === width ? '#007bff' : '#3a506b'}`,
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <div 
                style={{ 
                  width: `${width * 4}px`, 
                  height: `${width}px`, 
                  backgroundColor: color,
                  borderRadius: '2px'
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* 颜色选择 */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>{t('tools.color')}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {colors.map(colorOption => (
            <button
              key={colorOption.value}
              onClick={() => onColorChange(colorOption.value)}
              className={color === colorOption.value ? 'active' : ''}
              title={colorOption.label}
              style={{
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: color === colorOption.value ? 'rgba(0, 123, 255, 0.3)' : '#2c3e50',
                border: `1px solid ${color === colorOption.value ? '#007bff' : '#3a506b'}`,
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <div 
                style={{ 
                  width: '20px',
                  height: '20px',
                  backgroundColor: colorOption.value,
                  borderRadius: '50%'
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* 使用说明 */}
      <div>
        <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>{t('tools.instructions')}</h4>
        <div style={{ fontSize: '12px', lineHeight: '1.5', opacity: '0.9' }}>
          <p>• {t('tools.instruction1')}</p>
          <p>• {t('tools.instruction2')}</p>
          <p>• {t('tools.instruction3')}</p>
          <p>• {t('tools.instruction4')}</p>
          <p>• {t('tools.instruction5')}</p>
          <p><strong>{t('tools.spline')}:</strong> {t('tools.instructionSpline')}</p>
          <p><strong>{t('tools.freehand')}:</strong> {t('tools.instructionFreehand')}</p>
        </div>
      </div>
    </div>
  );
};

export default ToolSelector;
