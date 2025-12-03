// CanvasRenderer.js
import { PathRenderer } from './PathRenderer';

export const CanvasRenderer = {
  drawAll: (ctx, canvas, imageObj, annotations, selectedAnnotation, 
            lineWidth, color, startPoint = null, currentPoint = null, selectedTool = null,
            splinePoints = null, freehandPoints = null, shouldAutoClose = false) => {
    
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
      CanvasRenderer.drawPreview(ctx, selectedTool, startPoint, currentPoint, lineWidth, color, splinePoints, freehandPoints, shouldAutoClose);
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
          
          // 绘制控制点
          if (isSelected) {
            coords.points.forEach(point => {
              ctx.beginPath();
              ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
              ctx.fillStyle = '#00ff00';
              ctx.fill();
            });
          }
        }
        break;
      case 'freehand':
        if (coords.points && coords.points.length > 1) {
          PathRenderer.drawFreehand(ctx, coords.points, coords.closed || false);
          ctx.stroke();
          if (isSelected && coords.closed) {
            ctx.fill();
          }
          
          // 绘制控制点
          if (isSelected) {
            coords.points.forEach(point => {
              ctx.beginPath();
              ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
              ctx.fillStyle = '#00ff00';
              ctx.fill();
            });
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
  
  drawPreview: (ctx, shapeType, startPoint, currentPoint, lineWidth, color, splinePoints, freehandPoints, shouldAutoClose = false) => {
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
            
            // 绘制连接线（直线）
            if (index > 0) {
              ctx.beginPath();
              ctx.moveTo(splinePoints[index - 1].x, splinePoints[index - 1].y);
              ctx.lineTo(point.x, point.y);
              ctx.strokeStyle = `${color}80`;
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.lineWidth = lineWidth;
            }
          });
          
          // 绘制样条曲线预览（检查是否应该自动闭合）
          if (splinePoints.length > 1) {
            const shouldClosePreview = splinePoints.length >= 3 && 
              PathRenderer.shouldAutoClose(splinePoints, 20);
            
            // 绘制样条曲线段
            for (let i = 0; i < splinePoints.length - 1; i++) {
              const p0 = i > 0 ? splinePoints[i - 1] : splinePoints[i];
              const p1 = splinePoints[i];
              const p2 = splinePoints[i + 1];
              const p3 = i < splinePoints.length - 2 ? splinePoints[i + 2] : splinePoints[i + 1];
              
              ctx.beginPath();
              for (let t = 0; t <= 1; t += 0.05) {
                const t2 = t * t;
                const t3 = t2 * t;
                
                const x = 0.5 * ((2 * p1.x) +
                               (-p0.x + p2.x) * t +
                               (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                               (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
                
                const y = 0.5 * ((2 * p1.y) +
                               (-p0.y + p2.y) * t +
                               (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                               (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
                
                if (t === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              }
              ctx.strokeStyle = color;
              ctx.stroke();
            }
            
            // 如果接近闭合，绘制闭合段并显示提示
            if (shouldClosePreview && splinePoints.length >= 3) {
              const p0 = splinePoints[splinePoints.length - 2];
              const p1 = splinePoints[splinePoints.length - 1];
              const p2 = splinePoints[0];
              const p3 = splinePoints[1];
              
              ctx.beginPath();
              for (let t = 0; t <= 1; t += 0.05) {
                const t2 = t * t;
                const t3 = t2 * t;
                
                const x = 0.5 * ((2 * p1.x) +
                               (-p0.x + p2.x) * t +
                               (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                               (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
                
                const y = 0.5 * ((2 * p1.y) +
                               (-p0.y + p2.y) * t +
                               (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                               (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
                
                if (t === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              }
              ctx.strokeStyle = color;
              ctx.stroke();
              
              // 显示绿色提示点
              ctx.beginPath();
              ctx.arc(splinePoints[0].x, splinePoints[0].y, 6, 0, 2 * Math.PI);
              ctx.fillStyle = '#00ff00';
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.lineWidth = lineWidth;
            }
          }
          ctx.setLineDash([]);
        }
        break;
      case 'freehand':
        if (freehandPoints && freehandPoints.length > 1) {
          ctx.setLineDash([5, 5]);
          
          // 绘制自由手绘预览（检查是否应该自动闭合）
          const shouldClosePreview = shouldAutoClose || 
            (freehandPoints.length >= 10 && PathRenderer.shouldAutoClose(freehandPoints, 15));
          
          ctx.beginPath();
          ctx.moveTo(freehandPoints[0].x, freehandPoints[0].y);
          
          for (let i = 1; i < freehandPoints.length; i++) {
            ctx.lineTo(freehandPoints[i].x, freehandPoints[i].y);
          }
          
          // 如果应该闭合，连接到起点
          if (shouldClosePreview) {
            ctx.lineTo(freehandPoints[0].x, freehandPoints[0].y);
            
            // 显示绿色提示点
            ctx.beginPath();
            ctx.arc(freehandPoints[0].x, freehandPoints[0].y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#00ff00';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.lineWidth = lineWidth;
          }
          
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
