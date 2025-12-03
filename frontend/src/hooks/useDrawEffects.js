// useDrawEffects.js
import { useEffect } from 'react';
import { CanvasRenderer } from './CanvasRenderer';

export const useDrawEffects = ({
  canvasRef,
  imageLoaded,
  imageObj,
  annotations,
  selectedAnnotation,
  transform,
  selectedTool,
  lineWidth,
  color,
  drawing,
  startPoint,
  currentPoint,
  canvasContainerRef
}) => {
  // 绘制函数
  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !imageObj) return;
    
    const ctx = canvas.getContext('2d');
    CanvasRenderer.drawAll(
      ctx, 
      canvas, 
      imageObj, 
      annotations, 
      selectedAnnotation,
      transform,
      selectedTool,
      lineWidth,
      color,
      drawing ? startPoint : null,
      drawing ? currentPoint : null
    );
  };

  // 更新画布容器样式
  const updateCanvasContainerStyle = () => {
    const container = canvasContainerRef.current;
    if (!container) return;
    
    container.style.transform = `
      scale(${transform.scale})
      rotate(${transform.rotation}deg)
      translate(${transform.translateX}px, ${transform.translateY}px)
    `;
    container.style.transformOrigin = 'center center';
    container.style.transition = 'transform 0.1s ease-out';
  };

  // 当标注变化时重绘
  useEffect(() => {
    if (!drawing) {
      drawAll();
    }
  }, [annotations, selectedAnnotation, imageLoaded, drawing]);

  // 当绘制状态变化时重绘（显示/隐藏预览）
  useEffect(() => {
    if (drawing && startPoint && currentPoint) {
      drawAll();
    }
  }, [drawing, startPoint, currentPoint]);

  // 当变换变化时重绘
  useEffect(() => {
    drawAll();
    updateCanvasContainerStyle();
  }, [transform]);

  return { drawAll, updateCanvasContainerStyle };
};
