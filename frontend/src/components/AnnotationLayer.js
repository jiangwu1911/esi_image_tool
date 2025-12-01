import React, { useRef, useEffect } from 'react';
import AnnotationRenderer from './AnnotationRenderer';

function AnnotationLayer({
  imageDimensions,
  annotations,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  selectedTool,
  lineWidth,
  color,
  transform,
  language,
}) {
  const canvasRef = useRef(null);
  const annotationRendererRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && annotationRendererRef.current) {
      annotationRendererRef.current.drawAnnotations();
    }
  }, [annotations, transform, imageDimensions]);

  useEffect(() => {
    if (canvasRef.current && !annotationRendererRef.current) {
      annotationRendererRef.current = new AnnotationRenderer(
        canvasRef.current,
        imageDimensions,
        onAnnotationCreate,
        onAnnotationUpdate,
        onAnnotationDelete
      );
    }
  }, [imageDimensions]);

  useEffect(() => {
    if (annotationRendererRef.current) {
      annotationRendererRef.current.updateTool(selectedTool, lineWidth, color);
    }
  }, [selectedTool, lineWidth, color]);

  const handleCanvasClick = (e) => {
    if (annotationRendererRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 考虑变换应用坐标转换
      annotationRendererRef.current.handleClick(x, y);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={imageDimensions.width}
      height={imageDimensions.height}
      className="annotation-layer"
      onClick={handleCanvasClick}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: selectedTool === 'select' ? 'default' : 'crosshair',
      }}
    />
  );
}

export default AnnotationLayer;
