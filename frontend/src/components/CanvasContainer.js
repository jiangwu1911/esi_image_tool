// CanvasContainer.js
import React from 'react';

const CanvasContainer = ({
  canvasRef,
  canvasContainerRef,
  canvasSize,
  transform,
  imageLoaded,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
  selectedTool,
  dragging,
  isPanning
}) => {
  const containerStyle = {
    display: imageLoaded ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: canvasSize.width * transform.scale,
    height: canvasSize.height * transform.scale,
    // 重要：只应用缩放，旋转和平移在画布内部处理
    transform: `scale(${transform.scale})`,
    transformOrigin: 'center center',
  };

  const canvasCursor = selectedTool === 'select' 
    ? (dragging ? 'grabbing' : 'grab') 
    : 'crosshair';

  const canvasStyle = {
    border: '1px solid #2c3e50',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    backgroundColor: 'white',
    cursor: canvasCursor
  };

  return (
    <div 
      ref={canvasContainerRef}
      className="canvas-container"
      style={containerStyle}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={canvasStyle}
      />
    </div>
  );
};

export default CanvasContainer;
