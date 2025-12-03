// SplineTool.js - 修复版本
import { BaseAnnotationTool } from './BaseAnnotationTool';

export class SplineTool extends BaseAnnotationTool {
  constructor() {
    super();
    this.type = 'spline';
    this.shouldAutoClose = false;
  }
  
  onMouseDown(point, context) {
    console.log('Spline tool mouse down:', point, 'points count:', this.points.length);
    
    // 检查是否接近起点，如果是则自动闭合
    if (this.points.length >= 3) {
      const firstPoint = this.points[0];
      const distance = BaseAnnotationTool.pointDistance(point, firstPoint);
      
      console.log('Distance to first point:', distance);
      
      if (distance < 20) {
        console.log('Auto-closing spline');
        // 完成样条曲线
        const annotationData = this.getAnnotationData(
          context.label || `Spline ROI`,
          context.color,
          context.lineWidth
        );
        
        this.reset();
        return { 
          shouldDraw: false, 
          shouldCreateAnnotation: true,
          annotationData: annotationData,
          resetTool: true 
        };
      }
    }
    
    // 添加新点
    this.points.push(point);
    this.drawing = true;
    
    // 检查是否应该自动闭合（仅用于预览）
    if (this.points.length >= 3) {
      const firstPoint = this.points[0];
      const lastPoint = this.points[this.points.length - 1];
      this.shouldAutoClose = BaseAnnotationTool.pointDistance(lastPoint, firstPoint) < 20;
      console.log('Should auto close:', this.shouldAutoClose);
    }
    
    return { shouldDraw: true };
  }
  
  onMouseMove(point, context) {
    // 样条曲线不需要鼠标移动事件处理点添加
    return { shouldDraw: false };
  }
  
  onMouseUp(point, context) {
    // 样条曲线在鼠标按下时已经处理
    console.log('Spline tool mouse up, points:', this.points.length);
    return { shouldDraw: false };
  }
  
  onDoubleClick(point, context) {
    console.log('Spline tool double click, points:', this.points.length);
    if (this.points.length >= 3) {
      // 完成样条曲线
      const annotationData = this.getAnnotationData(
        context.label || `Spline ROI`,
        context.color,
        context.lineWidth
      );
      
      this.reset();
      return { 
        shouldDraw: false, 
        shouldCreateAnnotation: true,
        annotationData: annotationData,
        resetTool: true 
      };
    }
    return { shouldDraw: false };
  }
  
  draw(ctx, color, lineWidth) {
    if (this.points.length < 2) return;
    
    this.drawSplineCurve(ctx, this.points, true, color, lineWidth);
  }
  
  drawPreview(ctx, color, lineWidth) {
    if (this.points.length < 1) return;
    
    console.log('Drawing spline preview, points:', this.points.length);
    
    // 绘制点
    this.points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      
      // 绘制点之间的连线（直线）
      if (index > 0) {
        ctx.beginPath();
        ctx.moveTo(this.points[index - 1].x, this.points[index - 1].y);
        ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = `${color}80`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    
    // 绘制样条曲线预览
    if (this.points.length >= 2) {
      this.drawSplineCurve(ctx, this.points, false, color, lineWidth);
    }
    
    // 如果接近闭合，显示绿色提示点
    if (this.shouldAutoClose && this.points.length >= 3) {
      console.log('Showing auto-close indicator');
      ctx.beginPath();
      ctx.arc(this.points[0].x, this.points[0].y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#00ff00';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  drawSplineCurve(ctx, points, isComplete, color, lineWidth) {
    if (points.length < 2) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(isComplete ? [] : [5, 5]);
    ctx.beginPath();
    
    try {
      if (points.length === 2) {
        // 只有两个点，直接画直线
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
      } else {
        // 绘制Catmull-Rom样条曲线
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = i > 0 ? points[i - 1] : points[i];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
          
          // 绘制当前段
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
        
        // 如果应该自动闭合，绘制闭合段
        if (this.shouldAutoClose && points.length >= 3 && !isComplete) {
          const p0 = points[points.length - 2];
          const p1 = points[points.length - 1];
          const p2 = points[0];
          const p3 = points[1];
          
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
            
            ctx.lineTo(x, y);
          }
        }
      }
      
      ctx.stroke();
    } catch (error) {
      console.error('Error drawing spline curve:', error);
    }
    
    ctx.setLineDash([]);
  }
  
  isValid() {
    return this.points.length >= 3;
  }
  
  getAnnotationData(label, color, lineWidth) {
    if (this.points.length < 3) {
      console.log('Spline not valid, need at least 3 points');
      return null;
    }
    
    console.log('Creating spline annotation with', this.points.length, 'points');
    
    const closedPoints = [...this.points, this.points[0]];
    return {
      shape_type: 'spline',
      coordinates: { 
        points: this.points,
        closed: true,
        area: BaseAnnotationTool.calculatePathArea(closedPoints),
        length: BaseAnnotationTool.calculatePathLength(this.points)
      },
      label: label || `Spline ROI`,
      color: color,
      line_width: lineWidth
    };
  }
  
  reset() {
    super.reset();
    this.shouldAutoClose = false;
    console.log('Spline tool reset');
  }
}
