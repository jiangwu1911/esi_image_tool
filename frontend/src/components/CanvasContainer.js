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
    position: 'relative',
    display: imageLoaded ? 'block' : 'none',
    width: '100%',
    height: '100%',
  };

  const canvasCursor = isPanning ? 'grabbing' : (
    selectedTool === 'select' 
      ? (dragging ? 'grabbing' : 'grab') 
      : 'crosshair'
  );

  const canvasStyle = {
    border: '1px solid #2c3e50',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    backgroundColor: 'white',
    cursor: canvasCursor,
    // 所有变换都在这里应用
    transform: `
      translate(${transform.translateX}px, ${transform.translateY}px)
      rotate(${transform.rotation}deg)
      scale(${transform.scale})
    `,
    transformOrigin: 'center center',
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: `-${canvasSize.width / 2}px`,
    marginTop: `-${canvasSize.height / 2}px`,
    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
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
