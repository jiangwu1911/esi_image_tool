// AnnotationToolManager.js - 完整版本
import { RectangleTool } from './RectangleTool';
import { CircleTool } from './CircleTool';
import { EllipseTool } from './EllipseTool';
import { SimpleSplineTool } from './SimpleSplineTool';
import { SimpleFreehandTool } from './SimpleFreehandTool';

export class AnnotationToolManager {
  constructor() {
    this.tools = {
      rectangle: new RectangleTool(),
      circle: new CircleTool(),
      ellipse: new EllipseTool(),
      spline: new SimpleSplineTool(),
      freehand: new SimpleFreehandTool()
    };
    
    this.currentTool = null;
    this.context = {
      color: 'red',
      lineWidth: 2,
      label: ''
    };
    this.pendingAnnotation = null;
  }
  
  // 设置当前工具
  setCurrentTool(toolType) {
    console.log(`Setting current tool to: ${toolType}`);
    if (this.tools[toolType]) {
      // 重置之前的工具
      if (this.currentTool) {
        this.currentTool.reset();
      }
      
      this.currentTool = this.tools[toolType];
      this.pendingAnnotation = null;
      console.log(`Tool ${toolType} set successfully`);
      return true;
    }
    console.log(`Tool ${toolType} not found`);
    return false;
  }
  
  // 获取当前工具
  getCurrentTool() {
    return this.currentTool;
  }
  
  // 获取当前工具类型
  getCurrentToolType() {
    return this.currentTool ? this.currentTool.type : null;
  }
  
  // 设置上下文（颜色、线宽等）
  setContext(context) {
    this.context = { ...this.context, ...context };
  }
  
  // 处理鼠标按下事件
  handleMouseDown(point) {
    console.log('ToolManager handleMouseDown', point);
    if (!this.currentTool) {
      console.log('No current tool');
      return { shouldDraw: false, action: 'none', annotationData: null };
    }
    
    const result = this.currentTool.onMouseDown(point, this.context);
    console.log('Tool mouse down result:', result);
    
    // 如果有标注数据，保存起来
    if (result.annotationData) {
      this.pendingAnnotation = result.annotationData;
      console.log('Pending annotation saved from mouse down:', this.pendingAnnotation);
    }
    
    return { ...result, action: 'mouseDown' };
  }
  
  // 处理鼠标移动事件
  handleMouseMove(point) {
    if (!this.currentTool) {
      return { shouldDraw: false, action: 'none', annotationData: null };
    }
    
    const result = this.currentTool.onMouseMove(point, this.context);
    return { ...result, action: 'mouseMove' };
  }
  
  // 处理鼠标释放事件
  handleMouseUp(point) {
    console.log('ToolManager handleMouseUp', point);
    if (!this.currentTool) {
      return { shouldDraw: false, action: 'none', annotationData: null };
    }
    
    const result = this.currentTool.onMouseUp(point, this.context);
    console.log('Tool mouse up result:', result);
    
    // 如果有标注数据，保存起来
    if (result.shouldCreateAnnotation && result.annotationData) {
      this.pendingAnnotation = result.annotationData;
      console.log('Pending annotation saved from mouse up:', this.pendingAnnotation);
    } else if (result.shouldCreateAnnotation && !result.annotationData) {
      // 有些工具在onMouseUp时没有返回annotationData，需要调用getAnnotationData
      const annotationData = this.currentTool.getAnnotationData(
        this.context.label || `${this.currentTool.type} ROI`,
        this.context.color,
        this.context.lineWidth
      );
      
      if (annotationData) {
        this.pendingAnnotation = annotationData;
        console.log('Annotation data generated on mouse up:', this.pendingAnnotation);
      }
    }
    
    // 如果需要重置工具，但保留标注数据
    if (result.resetTool) {
      setTimeout(() => {
        if (this.currentTool) {
          this.currentTool.reset();
        }
      }, 0);
    }
    
    return { 
      ...result, 
      action: 'mouseUp',
      annotationData: this.pendingAnnotation 
    };
  }
  
  // 处理双击事件
  handleDoubleClick(point) {
    console.log('ToolManager handleDoubleClick', point);
    if (!this.currentTool) {
      return { shouldDraw: false, action: 'none', annotationData: null };
    }
    
    const result = this.currentTool.onDoubleClick(point, this.context);
    console.log('Tool double click result:', result);
    
    // 如果有标注数据，保存起来
    if (result.annotationData) {
      this.pendingAnnotation = result.annotationData;
    }
    
    return { ...result, action: 'doubleClick' };
  }
  
  // 获取并清除待处理的标注
  getAndClearPendingAnnotation() {
    const annotation = this.pendingAnnotation;
    this.pendingAnnotation = null;
    
    // 重置当前工具
    if (this.currentTool) {
      this.currentTool.reset();
    }
    
    return annotation;
  }
  
  // 检查是否有待处理的标注
  hasPendingAnnotation() {
    return this.pendingAnnotation !== null;
  }
  
  // 绘制当前工具的预览
  drawPreview(ctx) {
    if (!this.currentTool) return;
    
    this.currentTool.drawPreview(ctx, this.context.color, this.context.lineWidth);
  }
  
  // 绘制保存的标注
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
  
  // 绘制样条曲线标注 - 简化版本
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
        // 简化绘制：直接连接所有点
        const effectivePoints = isClosed ? [...points, points[0]] : points;
        
        ctx.moveTo(effectivePoints[0].x, effectivePoints[0].y);
        for (let i = 1; i < effectivePoints.length; i++) {
          ctx.lineTo(effectivePoints[i].x, effectivePoints[i].y);
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
    this.pendingAnnotation = null;
  }
  
  // 检查是否有正在进行的绘制
  isDrawing() {
    return this.currentTool ? this.currentTool.drawing : false;
  }
}
