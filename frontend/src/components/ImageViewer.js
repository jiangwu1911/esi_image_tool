// ImageViewer.js - 完整修复版本，确保绘制预览实时显示
import React, { useEffect, useRef, useState } from 'react';
import Toolbar from './Toolbar';
import TransformInfo from './TransformInfo';
import SelectionInfo from './SelectionInfo';
import CanvasContainer from './CanvasContainer';
import LoadingOverlay from './LoadingOverlay';
import { useImageViewer } from '../hooks/useImageViewer';

const ImageViewer = ({ 
  imageUrl, 
  annotations, 
  onAnnotationCreate, 
  onAnnotationUpdate,
  onAnnotationDelete,
  selectedTool,
  lineWidth,
  color,
  language = 'en'
}) => {
  const {
    // Refs
    canvasRef,
    containerRef,
    canvasContainerRef,
    
    // State
    selectedAnnotation,
    dragging,
    imageLoaded,
    imageObj,
    transform,
    isPanning,
    canvasSize,
    shouldDraw,
    forceRender,
    
    // Handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleMouseLeave,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    handleRotate,
    handlePanStart,
    handlePanEnd,
    handleReset,
    
    // Tool manager
    toolManager,
  } = useImageViewer({
    imageUrl,
    annotations,
    onAnnotationCreate,
    onAnnotationUpdate,
    onAnnotationDelete,
    selectedTool,
    lineWidth,
    color,
  });

  // 使用ref来避免重复渲染
  const drawRequestRef = useRef(null);
  
  // 绘制计数器，用于调试
  const [drawCount, setDrawCount] = useState(0);
  
  // 绘制函数 - 关键修复：确保绘制预览总是执行
  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !imageObj) {
      console.log('Cannot draw: canvas not ready');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Cannot draw: context not ready');
      return;
    }
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制图像
    ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
    
    // 绘制所有已保存的标注
    if (annotations && annotations.length > 0) {
      annotations.forEach(ann => {
        if (ann && ann.coordinates) {
          try {
            toolManager.drawAnnotation(ctx, ann, ann.id === selectedAnnotation?.id);
          } catch (error) {
            console.error('Error drawing annotation:', error, ann);
          }
        }
      });
    }
    
    // 关键修复：总是尝试绘制预览
    // 工具管理器内部会检查是否有需要绘制的预览
    if (selectedTool && selectedTool !== 'select') {
      try {
        toolManager.drawPreview(ctx);
      } catch (error) {
        console.error('Error drawing preview:', error);
      }
    }
    
    // 更新绘制计数器（用于调试）
    setDrawCount(prev => prev + 1);
  };

  // 当状态变化时重绘 - 关键修复：添加更多依赖项
  useEffect(() => {
    console.log('ImageViewer useEffect triggered:', {
      annotationsLength: annotations?.length,
      selectedAnnotationId: selectedAnnotation?.id,
      imageLoaded,
      shouldDraw,
      selectedTool,
      forceRender,
      drawCount,
      canvasSize
    });
    
    if (drawRequestRef.current) {
      cancelAnimationFrame(drawRequestRef.current);
    }
    
    drawRequestRef.current = requestAnimationFrame(() => {
      console.log('RequestAnimationFrame: drawing all');
      drawAll();
    });
    
    return () => {
      if (drawRequestRef.current) {
        cancelAnimationFrame(drawRequestRef.current);
      }
    };
  }, [
    annotations, 
    selectedAnnotation, 
    imageLoaded, 
    shouldDraw, 
    transform, 
    selectedTool, 
    forceRender,
    color,
    lineWidth
  ]);

  // 监听画布大小变化
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      console.log('Canvas size changed:', canvasSize);
      drawAll();
    }
  }, [canvasSize.width, canvasSize.height]);

  // 监听工具变化，强制立即重绘
  useEffect(() => {
    console.log('Selected tool changed to:', selectedTool);
    drawAll();
  }, [selectedTool]);

  // 获取当前工具信息
  const getToolInfo = () => {
    if (!selectedTool || selectedTool === 'select') return null;
    
    const toolType = toolManager.getCurrentToolType();
    if (!toolType) return null;
    
    let info = {};
    
    switch (toolType) {
      case 'rectangle':
        info = {
          title: language === 'zh' ? '矩形工具' : 'Rectangle Tool',
          instruction: language === 'zh' ? '点击并拖动绘制矩形，ESC取消' : 'Click and drag to draw rectangle, ESC to cancel',
          icon: '□'
        };
        break;
      case 'circle':
        info = {
          title: language === 'zh' ? '圆形工具' : 'Circle Tool',
          instruction: language === 'zh' ? '点击并拖动绘制圆形，ESC取消' : 'Click and drag to draw circle, ESC to cancel',
          icon: '○'
        };
        break;
      case 'ellipse':
        info = {
          title: language === 'zh' ? '椭圆工具' : 'Ellipse Tool',
          instruction: language === 'zh' ? '点击并拖动绘制椭圆，ESC取消' : 'Click and drag to draw ellipse, ESC to cancel',
          icon: '◯'
        };
        break;
      case 'spline':
        info = {
          title: language === 'zh' ? '样条曲线工具' : 'Spline Tool',
          instruction: language === 'zh' ? '点击添加控制点，双击或按Enter完成，ESC取消' : 'Click to add control points, double-click or press Enter to finish, ESC to cancel',
          icon: '⤡'
        };
        break;
      case 'freehand':
        info = {
          title: language === 'zh' ? '自由手绘工具' : 'Freehand Tool',
          instruction: language === 'zh' ? '点击并拖动绘制，松开完成，ESC取消' : 'Click and drag to draw, release to finish, ESC to cancel',
          icon: '✎'
        };
        break;
      default:
        return null;
    }
    
    return info;
  };

  const toolInfo = getToolInfo();

  // 调试信息
  const debugInfo = {
    isDrawing: shouldDraw,
    selectedTool,
    toolType: toolManager.getCurrentToolType(),
    currentTool: toolManager.getCurrentTool(),
    pendingAnnotation: toolManager.hasPendingAnnotation(),
    imageLoaded,
    canvasSize,
    drawCount,
    forceRender
  };

  return (
    <div 
      ref={containerRef}
      className="image-viewer"
      onWheel={handleWheel}
      style={{
        cursor: isPanning ? 'grabbing' : (
          selectedTool === 'select' 
            ? (dragging ? 'grabbing' : 'grab') 
            : selectedTool && selectedTool !== 'select'
            ? 'crosshair' 
            : 'default'
        ),
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e'
      }}
    >
      {/* 顶部工具栏 */}
      <Toolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onPan={isPanning ? handlePanEnd : handlePanStart}
        onReset={handleReset}
        language={language}
        isPanning={isPanning}
      />
      
      {/* 变换信息显示 */}
      <TransformInfo
        transform={transform}
        isPanning={isPanning}
        language={language}
      />
 
      {/* 选择信息显示 */}
      <SelectionInfo
        selectedAnnotation={selectedAnnotation}
        language={language}
      />
      
      {/* 工具信息提示 */}
      {toolInfo && (
        <div 
          className="tool-info"
          style={{
            position: 'absolute',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(35, 49, 67, 0.9)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '20px',
            fontSize: '14px',
            border: '1px solid #2c3e50',
            zIndex: 1001,
            backdropFilter: 'blur(5px)',
            textAlign: 'center',
            maxWidth: '80%',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            fontWeight: 'bold', 
            marginBottom: '2px' 
          }}>
            <span style={{ 
              backgroundColor: color, 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%',
              display: 'inline-block'
            }}></span>
            <span>{toolInfo.title}</span>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>{toolInfo.icon}</span>
          </div>
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.9,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '4px'
          }}>
            {toolInfo.instruction}
          </div>
        </div>
      )}
      
      {/* 加载覆盖层 */}
      <LoadingOverlay
        show={!imageLoaded && imageUrl}
        language={language}
      />
      
      {/* 画布容器 */}
      <CanvasContainer
        canvasRef={canvasRef}
        canvasContainerRef={canvasContainerRef}
        canvasSize={canvasSize}
        transform={transform}
        imageLoaded={imageLoaded}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
        handleDoubleClick={handleDoubleClick}
        handleMouseLeave={handleMouseLeave}
        selectedTool={selectedTool}
        dragging={dragging}
        isPanning={isPanning}
      />
      
      {/* 调试信息（开发时可用） */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#00ff00',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          zIndex: 9999,
          maxWidth: '300px',
          maxHeight: '200px',
          overflow: 'auto',
          display: 'none' // 默认隐藏，需要时可设置为 'block'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Debug Info:</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </div>
        </div>
      )}
      
      {/* 状态指示器 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        {/* 绘制状态指示器 */}
        {shouldDraw && (
          <div style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            animation: 'pulse 1.5s infinite',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              animation: 'blink 1s infinite'
            }}></div>
            <span>{language === 'zh' ? '绘制中...' : 'Drawing...'}</span>
          </div>
        )}
        
        {/* 平移状态指示器 */}
        {isPanning && (
          <div style={{
            backgroundColor: '#FF9800',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            {language === 'zh' ? '平移模式' : 'Pan Mode'}
          </div>
        )}
        
        {/* 标注计数 */}
        <div style={{
          backgroundColor: 'rgba(35, 49, 67, 0.8)',
          color: '#e0e0e0',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          border: '1px solid #2c3e50'
        }}>
          {language === 'zh' ? '标注: ' : 'Annotations: '}
          <span style={{ 
            fontWeight: 'bold',
            color: annotations && annotations.length > 0 ? '#4CAF50' : '#e0e0e0'
          }}>
            {annotations ? annotations.length : 0}
          </span>
        </div>
      </div>
      
      {/* CSS动画 */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .image-viewer {
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default ImageViewer;
