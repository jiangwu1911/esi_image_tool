// CanvasContainer.js - 直接修复鼠标事件绑定
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
  handleDoubleClick,
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

  // 关键修复：创建确保被调用的包装函数
  const handleMouseDownWrapper = (e) => {
    console.log('Canvas mouse down triggered');
    e.preventDefault();
    if (handleMouseDown) {
      handleMouseDown(e);
    }
  };

  const handleMouseUpWrapper = (e) => {
    console.log('Canvas mouse up triggered'); // 添加日志确认事件触发
    e.preventDefault();
    if (handleMouseUp) {
      handleMouseUp(e);
    }
  };

  const handleMouseMoveWrapper = (e) => {
    e.preventDefault();
    if (handleMouseMove) {
      handleMouseMove(e);
    }
  };

  const handleDoubleClickWrapper = (e) => {
    e.preventDefault();
    if (handleDoubleClick) {
      handleDoubleClick(e);
    }
  };

  return (
    <div 
      ref={canvasContainerRef}
      className="canvas-container"
      style={containerStyle}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDownWrapper}
        onMouseMove={handleMouseMoveWrapper}
        onMouseUp={handleMouseUpWrapper}
        onDoubleClick={handleDoubleClickWrapper}
        onMouseLeave={handleMouseLeave}
        style={canvasStyle}
        width={canvasSize.width}
        height={canvasSize.height}
      />
    </div>
  );
};

export default CanvasContainer;
