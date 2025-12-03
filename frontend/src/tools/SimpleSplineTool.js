// SimpleSplineTool.js - 放在 tools/ 目录下
import { BaseAnnotationTool } from './BaseAnnotationTool';

export class SimpleSplineTool extends BaseAnnotationTool {
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
    
    // 检查是否应该自动闭合
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
    return { shouldDraw: false };
  }
  
  onDoubleClick(point, context) {
    console.log('Spline tool double click, points:', this.points.length);
    if (this.points.length >= 2) {
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
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    // 简单连接所有点
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    
    ctx.stroke();
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
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      
      // 如果接近闭合，显示绿色提示点
      if (this.shouldAutoClose && this.points.length >= 3) {
        console.log('Showing auto-close indicator');
        ctx.lineTo(this.points[0].x, this.points[0].y);
        
        ctx.beginPath();
        ctx.arc(this.points[0].x, this.points[0].y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  
  isValid() {
    return this.points.length >= 2;
  }
  
  getAnnotationData(label, color, lineWidth) {
    if (this.points.length < 2) {
      console.log('Spline not valid, need at least 2 points');
      return null;
    }
    
    console.log('Creating spline annotation with', this.points.length, 'points');
    
    // 检查是否应该闭合（如果接近起点）
    const shouldClose = this.shouldAutoClose && this.points.length >= 3;
    const finalPoints = shouldClose ? [...this.points, this.points[0]] : this.points;
    
    return {
      shape_type: 'spline',
      coordinates: { 
        points: this.points,
        closed: shouldClose,
        area: shouldClose ? BaseAnnotationTool.calculatePathArea(finalPoints) : 0,
        length: BaseAnnotationTool.calculatePathLength(finalPoints)
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
