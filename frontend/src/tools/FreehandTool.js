// FreehandTool.js - 修复版本
import { BaseAnnotationTool } from './BaseAnnotationTool';

export class FreehandTool extends BaseAnnotationTool {
  constructor() {
    super();
    this.type = 'freehand';
    this.shouldAutoClose = false;
  }
  
  onMouseDown(point, context) {
    console.log('Freehand tool mouse down');
    this.drawing = true;
    this.points = [point];
    this.shouldAutoClose = false;
    return { shouldDraw: true };
  }
  
  onMouseMove(point, context) {
    if (this.drawing) {
      this.points.push(point);
      
      // 检查是否应该自动闭合
      if (this.points.length >= 10) {
        const firstPoint = this.points[0];
        const lastPoint = this.points[this.points.length - 1];
        this.shouldAutoClose = BaseAnnotationTool.pointDistance(lastPoint, firstPoint) < 15;
        console.log('Freehand should auto close:', this.shouldAutoClose);
      }
      
      return { shouldDraw: true };
    }
    return { shouldDraw: false };
  }
  
  onMouseUp(point, context) {
    console.log('Freehand tool mouse up, points:', this.points.length);
    
    if (this.drawing && this.points.length > 1) {
      // 添加最后一个点
      this.points.push(point);
      
      // 检查是否应该自动闭合
      const firstPoint = this.points[0];
      const lastPoint = this.points[this.points.length - 1];
      const shouldClose = BaseAnnotationTool.pointDistance(lastPoint, firstPoint) < 15 || this.shouldAutoClose;
      
      console.log('Freehand should close:', shouldClose);
      
      // 准备最终点数组
      let finalPoints = [...this.points];
      if (shouldClose && this.points.length >= 3) {
        finalPoints.push({ x: firstPoint.x, y: firstPoint.y }); // 添加起点作为终点使其闭合
      }
      
      // 简化路径
      const simplifiedPoints = BaseAnnotationTool.simplifyPath(finalPoints, 2.0);
      console.log('Simplified points:', simplifiedPoints.length);
      
      // 创建标注数据
      const isClosed = shouldClose && simplifiedPoints.length >= 3;
      const annotationData = {
        shape_type: 'freehand',
        coordinates: { 
          points: simplifiedPoints,
          closed: isClosed,
          area: isClosed ? BaseAnnotationTool.calculatePathArea(simplifiedPoints) : 0,
          length: BaseAnnotationTool.calculatePathLength(simplifiedPoints)
        },
        label: context.label || `Freehand ROI ${isClosed ? '(Closed)' : ''}`,
        color: context.color,
        line_width: context.lineWidth
      };
      
      console.log('Freehand annotation data created');
      
      this.reset();
      return { 
        shouldDraw: false, 
        shouldCreateAnnotation: simplifiedPoints.length >= 2,
        annotationData: annotationData,
        resetTool: true 
      };
    }
    
    this.reset();
    return { shouldDraw: false };
  }
  
  draw(ctx, color, lineWidth) {
    if (this.points.length < 2) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    
    ctx.stroke();
  }
  
  drawPreview(ctx, color, lineWidth) {
    if (this.points.length < 2) return;
    
    console.log('Drawing freehand preview, points:', this.points.length);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    
    // 如果应该闭合，显示提示
    if (this.shouldAutoClose && this.points.length >= 3) {
      console.log('Showing freehand auto-close indicator');
      ctx.lineTo(this.points[0].x, this.points[0].y);
      
      // 显示绿色提示点
      ctx.beginPath();
      ctx.arc(this.points[0].x, this.points[0].y, 6, 0, 2 * Math.PI);
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
  
  isValid() {
    return this.points.length >= 2;
  }
  
  getAnnotationData(label, color, lineWidth) {
    // 已经在onMouseUp中处理
    return null;
  }
  
  reset() {
    super.reset();
    this.shouldAutoClose = false;
    console.log('Freehand tool reset');
  }
}
