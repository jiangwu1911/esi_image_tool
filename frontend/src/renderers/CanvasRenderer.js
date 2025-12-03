// CanvasRenderer.js
import { PathRenderer } from './PathRenderer';

export const CanvasRenderer = {
  drawAll: (ctx, canvas, imageObj, annotations, selectedAnnotation, 
            lineWidth, color, startPoint = null, currentPoint = null, selectedTool = null,
            splinePoints = null, freehandPoints = null) => {
    
    if (!ctx || !canvas || !imageObj) return;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制图像
    ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
    
    // 绘制所有已保存的标注
    annotations.forEach(ann => {
      CanvasRenderer.drawAnnotation(ctx, ann, ann.id === selectedAnnotation?.id, lineWidth, color);
    });
    
    // 如果正在绘制，绘制预览
    if (selectedTool && selectedTool !== 'select') {
      CanvasRenderer.drawPreview(ctx, selectedTool, startPoint, currentPoint, lineWidth, color, splinePoints, freehandPoints);
    }
  },
  
  drawAnnotation: (ctx, annotation, isSelected, defaultLineWidth, defaultColor) => {
    const coords = annotation.coordinates;
    const annColor = annotation.color || defaultColor;
    const annLineWidth = annotation.line_width || defaultLineWidth;
    
    ctx.strokeStyle = isSelected ? '#00ff00' : annColor;
    ctx.lineWidth = isSelected ? annLineWidth + 2 : annLineWidth;
    ctx.setLineDash(isSelected ? [5, 5] : []);
    ctx.fillStyle = isSelected ? 'rgba(0, 255, 0, 0.1)' : `${annColor}20`;
    
    switch (annotation.shape_type) {
      case 'rectangle':
        ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
        if (isSelected) {
          ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
        }
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, coords.radius, 0, 2 * Math.PI);
        ctx.stroke();
        if (isSelected) {
          ctx.fill();
        }
        break;
      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(coords.x, coords.y, coords.radiusX, coords.radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
        if (isSelected) {
          ctx.fill();
        }
        break;
      case 'spline':
        if (coords.points && coords.points.length > 1) {
          PathRenderer.drawSpline(ctx, coords.points, coords.closed || false);
          ctx.stroke();
          if (isSelected && coords.closed) {
            ctx.fill();
          }
        }
        break;
      case 'freehand':
        if (coords.points && coords.points.length > 1) {
          PathRenderer.drawFreehand(ctx, coords.points);
          ctx.stroke();
          if (isSelected) {
            ctx.fill();
          }
        }
        break;
      default:
        break;
    }
    
    // 绘制标签
    if (annotation.label) {
      ctx.fillStyle = isSelected ? '#00ff00' : annColor;
      ctx.font = '16px Arial';
      ctx.fillText(annotation.label, coords.x, coords.y - 10);
    }

    ctx.setLineDash([]);
  },
  
  drawPreview: (ctx, shapeType, startPoint, currentPoint, lineWidth, color, splinePoints, freehandPoints) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.fillStyle = `${color}20`;
    
    switch (shapeType) {
      case 'rectangle':
        if (startPoint && currentPoint) {
          const coords = calculateRectangleCoordinates(startPoint, currentPoint);
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
          ctx.setLineDash([]);
        }
        break;
      case 'circle':
        if (startPoint && currentPoint) {
          const coords = calculateCircleCoordinates(startPoint, currentPoint);
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(coords.x, coords.y, coords.radius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        break;
      case 'ellipse':
        if (startPoint && currentPoint) {
          const coords = calculateEllipseCoordinates(startPoint, currentPoint);
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.ellipse(coords.x, coords.y, coords.radiusX, coords.radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        break;
      case 'spline':
        if (splinePoints && splinePoints.length > 0) {
          ctx.setLineDash([5, 5]);
          // 绘制点
          splinePoints.forEach((point, index) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            
            // 绘制连接线
            if (index > 0) {
              ctx.beginPath();
              ctx.moveTo(splinePoints[index - 1].x, splinePoints[index - 1].y);
              ctx.lineTo(point.x, point.y);
              ctx.strokeStyle = `${color}80`;
              ctx.stroke();
            }
          });
          
          // 绘制样条曲线
          if (splinePoints.length > 1) {
            PathRenderer.drawSpline(ctx, splinePoints, false);
            ctx.strokeStyle = color;
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
        break;
      case 'freehand':
        if (freehandPoints && freehandPoints.length > 1) {
          ctx.setLineDash([5, 5]);
          PathRenderer.drawFreehand(ctx, freehandPoints);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        break;
    }
  }
};

// 辅助函数
function calculateRectangleCoordinates(startPoint, currentPoint) {
  return {
    x: Math.min(startPoint.x, currentPoint.x),
    y: Math.min(startPoint.y, currentPoint.y),
    width: Math.abs(currentPoint.x - startPoint.x),
    height: Math.abs(currentPoint.y - startPoint.y)
  };
}

function calculateCircleCoordinates(startPoint, currentPoint) {
  const radius = Math.sqrt(
    Math.pow(currentPoint.x - startPoint.x, 2) + 
    Math.pow(currentPoint.y - startPoint.y, 2)
  );
  return { x: startPoint.x, y: startPoint.y, radius: radius };
}

function calculateEllipseCoordinates(startPoint, currentPoint) {
  const radiusX = Math.abs(currentPoint.x - startPoint.x);
  const radiusY = Math.abs(currentPoint.y - startPoint.y);
  return { x: startPoint.x, y: startPoint.y, radiusX: radiusX, radiusY: radiusY };
}
