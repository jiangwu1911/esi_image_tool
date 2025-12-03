// AnnotationToolManager.js - 修复版本
import { RectangleTool } from './RectangleTool';
import { CircleTool } from './CircleTool';
import { EllipseTool } from './EllipseTool';
import { SplineTool } from './SplineTool';
import { FreehandTool } from './FreehandTool';

export class AnnotationToolManager {
  constructor() {
    this.tools = {
      rectangle: new RectangleTool(),
      circle: new CircleTool(),
      ellipse: new EllipseTool(),
      spline: new SplineTool(),
      freehand: new FreehandTool()
    };
    
    this.currentTool = null;
    this.context = {
      color: 'red',
      lineWidth: 2,
      label: ''
    };
  }
  
  // 设置当前工具
  setCurrentTool(toolType) {
    if (this.tools[toolType]) {
      this.currentTool = this.tools[toolType];
      return true;
    }
    return false;
  }
  
  // 获取当前工具
  getCurrentTool() {
    return this.currentTool;
  }
  
  // 设置上下文（颜色、线宽等）
  setContext(context) {
    this.context = { ...this.context, ...context };
  }
  
  // 处理鼠标事件 - 修复：返回更详细的结果
  handleMouseDown(point) {
    if (!this.currentTool) return { shouldDraw: false, action: 'none' };
    
    const result = this.currentTool.onMouseDown(point, this.context);
    return { ...result, action: 'mouseDown' };
  }
  
  handleMouseMove(point) {
    if (!this.currentTool) return { shouldDraw: false, action: 'none' };
    
    const result = this.currentTool.onMouseMove(point, this.context);
    return { ...result, action: 'mouseMove' };
  }
  
  handleMouseUp(point) {
    if (!this.currentTool) return { shouldDraw: false, action: 'none' };
    
    const result = this.currentTool.onMouseUp(point, this.context);
    return { ...result, action: 'mouseUp' };
  }
  
  handleDoubleClick(point) {
    if (!this.currentTool) return { shouldDraw: false, action: 'none' };
    
    const result = this.currentTool.onDoubleClick(point, this.context);
    return { ...result, action: 'doubleClick' };
  }
  
  // 绘制当前工具的预览
  drawPreview(ctx) {
    if (!this.currentTool) return;
    
    this.currentTool.drawPreview(ctx, this.context.color, this.context.lineWidth);
  }
  
  // 绘制保存的标注 - 简化版本
  drawAnnotation(ctx, annotation, isSelected = false) {
    if (!annotation || !annotation.coordinates) return;
    
    const coords = annotation.coordinates;
    const color = isSelected ? '#00ff00' : (annotation.color || this.context.color);
    const lineWidth = isSelected ? (annotation.line_width || this.context.lineWidth) + 2 : 
                   (annotation.line_width || this.context.lineWidth);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.fillStyle = isSelected ? 'rgba(0, 255, 0, 0.1)' : `${color}20`;
    ctx.setLineDash(isSelected ? [5, 5] : []);
    
    try {
      switch (annotation.shape_type) {
        case 'rectangle':
          if (coords.x !== undefined && coords.y !== undefined && coords.width !== undefined && coords.height !== undefined) {
            ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
            if (isSelected) {
              ctx.fillRect(coords.x, coords.y, coords.width, coords.height);
            }
          }
          break;
          
        case 'circle':
          if (coords.x !== undefined && coords.y !== undefined && coords.radius !== undefined) {
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, coords.radius, 0, 2 * Math.PI);
            ctx.stroke();
            if (isSelected) {
              ctx.fill();
            }
          }
          break;
          
        case 'ellipse':
          if (coords.x !== undefined && coords.y !== undefined && coords.radiusX !== undefined && coords.radiusY !== undefined) {
            ctx.beginPath();
            ctx.ellipse(coords.x, coords.y, coords.radiusX, coords.radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
            if (isSelected) {
              ctx.fill();
            }
          }
          break;
          
        case 'spline':
          if (coords.points && Array.isArray(coords.points) && coords.points.length >= 2) {
            this.drawSplineAnnotation(ctx, coords.points, coords.closed || false, color, lineWidth);
            if (isSelected && coords.closed) {
              ctx.fill();
            }
            
            // 绘制控制点
            if (isSelected) {
              ctx.fillStyle = '#00ff00';
              coords.points.forEach(point => {
                if (point.x !== undefined && point.y !== undefined) {
                  ctx.beginPath();
                  ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
                  ctx.fill();
                }
              });
            }
          }
          break;
          
        case 'freehand':
          if (coords.points && Array.isArray(coords.points) && coords.points.length >= 2) {
            ctx.beginPath();
            const firstPoint = coords.points[0];
            if (firstPoint.x !== undefined && firstPoint.y !== undefined) {
              ctx.moveTo(firstPoint.x, firstPoint.y);
              
              for (let i = 1; i < coords.points.length; i++) {
                const point = coords.points[i];
                if (point.x !== undefined && point.y !== undefined) {
                  ctx.lineTo(point.x, point.y);
                }
              }
              
              if (coords.closed) {
                ctx.closePath();
              }
              
              ctx.stroke();
              if (isSelected && coords.closed) {
                ctx.fill();
              }
            }
          }
          break;
          
        default:
          console.warn(`Unknown shape type: ${annotation.shape_type}`);
      }
      
      // 绘制标签
      if (annotation.label && coords.x !== undefined && coords.y !== undefined) {
        ctx.fillStyle = isSelected ? '#00ff00' : color;
        ctx.font = '16px Arial';
        ctx.fillText(annotation.label, coords.x, coords.y - 10);
      }
      
    } catch (error) {
      console.error('Error drawing annotation:', error, annotation);
    }
    
    ctx.setLineDash([]);
  }
  
  // 绘制样条曲线标注
  drawSplineAnnotation(ctx, points, isClosed, color, lineWidth) {
    if (!points || points.length < 2) return;
    
    ctx.beginPath();
    
    try {
      if (points.length === 2) {
        // 只有两个点，直接画直线
        const p0 = points[0];
        const p1 = points[1];
        if (p0.x !== undefined && p0.y !== undefined && p1.x !== undefined && p1.y !== undefined) {
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
        }
      } else {
        // 绘制Catmull-Rom样条曲线
        const effectivePoints = isClosed ? [...points, points[0]] : points;
        
        for (let i = 0; i < effectivePoints.length - 1; i++) {
          const p0 = i > 0 ? effectivePoints[i - 1] : effectivePoints[i];
          const p1 = effectivePoints[i];
          const p2 = effectivePoints[i + 1];
          const p3 = i < effectivePoints.length - 2 ? effectivePoints[i + 2] : effectivePoints[i + 1];
          
          // 检查所有点是否有效
          if (!p0 || !p1 || !p2 || !p3 || 
              p0.x === undefined || p0.y === undefined ||
              p1.x === undefined || p1.y === undefined ||
              p2.x === undefined || p2.y === undefined ||
              p3.x === undefined || p3.y === undefined) {
            continue;
          }
          
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
            
            if (t === 0 && i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
      }
      
      ctx.stroke();
    } catch (error) {
      console.error('Error drawing spline:', error);
    }
  }
  
  // 重置所有工具
  resetAllTools() {
    Object.values(this.tools).forEach(tool => tool.reset());
  }
  
  // 获取当前工具类型
  getCurrentToolType() {
    return this.currentTool ? this.currentTool.type : null;
  }
  
  // 检查是否有正在进行的绘制
  isDrawing() {
    return this.currentTool ? this.currentTool.drawing : false;
  }
}
