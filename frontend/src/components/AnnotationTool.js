import React from 'react';

const AnnotationTool = ({ onToolSelect, selectedTool }) => {
  const tools = [
    { type: 'rectangle', label: 'Rectangle' },
    { type: 'circle', label: 'Circle' },
    { type: 'ellipse', label: 'Ellipse' }
  ];

  return (
    <div className="annotation-tool">
      <h3>Annotation Tools</h3>
      <div className="tool-buttons">
        {tools.map(tool => (
          <button
            key={tool.type}
            onClick={() => onToolSelect(tool.type)}
            className={selectedTool === tool.type ? 'active' : ''}
          >
            {tool.label}
          </button>
        ))}
      </div>
      
      {selectedTool && (
        <div className="annotation-form">
          <div className="instructions">
            Click and drag on the image to draw a {selectedTool}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationTool;
