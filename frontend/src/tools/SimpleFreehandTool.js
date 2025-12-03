// SimpleFreehandTool.js - 修复点击完成问题
import { BaseAnnotationTool } from './BaseAnnotationTool';

export class SimpleFreehandTool extends BaseAnnotationTool {
  constructor() {
    super();
    this.type = 'freehand';
    this.shouldAutoClose = false;
    this.isCompleting = false;
    this.waitingForClick = false; // 添加新状态
  }
  
  onMouseDown(point, context) {
    console.log('Freehand tool mouse down at:', point);
    console.log('Current state:', {
      drawing: this.drawing,
      shouldAutoClose: this.shouldAutoClose,
      isCompleting: this.isCompleting,
      waitingForClick: this.waitingForClick,
      pointsCount: this.points.length
    });
    
    // 如果处于等待点击完成状态，点击任意位置完成标注
    if (this.waitingForClick) {
      console.log('Waiting for click - completing annotation');
      const annotationData = this.completeFreehand(context);
      
      this.reset();
      return { 
        shouldDraw: false, 
        shouldCreateAnnotation: true,
        annotationData: annotationData,
        resetTool: true 
      };
    }
    
    // 如果正在完成状态，但还未等待点击（比如刚从闭合检测进入）
    if (this.isCompleting && !this.waitingForClick) {
      console.log('Already completing - setting waiting for click');
      this.waitingForClick = true;
      return { 
        shouldDraw: true, // 继续绘制，更新提示
        shouldCreateAnnotation: false 
      };
    }
    
    // 否则开始新的绘制
    this.drawing = true;
    this.points = [point];
    this.shouldAutoClose = false;
    this.isCompleting = false;
    this.waitingForClick = false;
    return { shouldDraw: true };
  }
  
  onMouseMove(point, context) {
    if (this.drawing && !this.isCompleting) {
      this.points.push(point);
      
      // 检查是否应该自动闭合
      if (this.points.length >= 10) {
        const firstPoint = this.points[0];
        const lastPoint = this.points[this.points.length - 1];
        const distance = BaseAnnotationTool.pointDistance(lastPoint, firstPoint);
        
        if (distance < 15) {
          this.shouldAutoClose = true;
          console.log('Should auto close detected, distance:', distance);
        }
      }
      
      return { shouldDraw: true };
    }
    return { shouldDraw: false };
  }
  
  onMouseUp(point, context) {
    console.log('Freehand tool mouse up at:', point);
    console.log('Current state:', {
      drawing: this.drawing,
      shouldAutoClose: this.shouldAutoClose,
      pointsCount: this.points.length
    });
    
    if (this.drawing && this.points.length > 1) {
      // 添加最后一个点
      this.points.push(point);
      
      // 检查是否应该闭合
      const firstPoint = this.points[0];
      const lastPoint = this.points[this.points.length - 1];
      const distance = BaseAnnotationTool.pointDistance(lastPoint, firstPoint);
      
      console.log('Distance to start:', distance, 'Threshold:', 15);
      
      // 关键修复：只有当距离非常近时才进入完成状态
      if (distance < 15 && this.points.length >= 3) {
        console.log('Close to start, entering completion mode');
        this.shouldAutoClose = true;
        this.isCompleting = true;
        this.waitingForClick = true; // 直接进入等待点击状态
        this.drawing = false;
        
        return { 
          shouldDraw: true, 
          shouldCreateAnnotation: false
        };
      } else {
        // 非闭合曲线：立即创建标注
        console.log('Not close enough to start, creating non-closed annotation');
        const simplifiedPoints = BaseAnnotationTool.simplifyPath([...this.points], 2.0);
        
        const annotationData = {
          shape_type: 'freehand',
          coordinates: { 
            points: simplifiedPoints,
            closed: false,
            area: 0,
            length: BaseAnnotationTool.calculatePathLength(simplifiedPoints)
          },
          label: context.label || 'Freehand ROI',
          color: context.color,
          line_width: context.lineWidth
        };
        
        this.reset();
        return { 
          shouldDraw: false, 
          shouldCreateAnnotation: true,
          annotationData: annotationData,
          resetTool: true 
        };
      }
    }
    
    // 如果没有足够点，重置
    if (this.drawing && this.points.length <= 1) {
      console.log('Too few points, resetting');
      this.reset();
    }
    
    return { shouldDraw: false };
  }
  
  onDoubleClick(point, context) {
    console.log('Freehand tool double click');
    
    // 如果已经有绘制的点，完成它
    if (this.points.length >= 2) {
      console.log('Completing via double click');
      const annotationData = this.completeFreehand(context);
      if (annotationData) {
        return { 
          shouldDraw: false, 
          shouldCreateAnnotation: true,
          annotationData: annotationData,
          resetTool: true 
        };
      }
    }
    
    return { shouldDraw: false };
  }
  
  completeFreehand(context) {
    if (this.points.length >= 2) {
      console.log('Completing freehand with', this.points.length, 'points');
      
      // 准备最终点数组
      let finalPoints = [...this.points];
      const shouldClose = this.shouldAutoClose && this.points.length >= 3;
      
      if (shouldClose) {
        // 对于闭合曲线，复制第一个点到最后以形成闭合路径
        finalPoints.push({ x: this.points[0].x, y: this.points[0].y });
        console.log('Adding closing point for closed freehand');
      }
      
      // 简化路径
      const simplifiedPoints = BaseAnnotationTool.simplifyPath(finalPoints, 2.0);
      console.log('Simplified from', finalPoints.length, 'to', simplifiedPoints.length, 'points');
      
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
      
      console.log('✅ Freehand completed successfully');
      return annotationData;
    }
    
    console.log('❌ Not enough points to complete freehand');
    return null;
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
    
    // 如果应该闭合，绘制闭合线
    if (this.shouldAutoClose && this.points.length >= 3) {
      ctx.lineTo(this.points[0].x, this.points[0].y);
    }
    
    ctx.stroke();
  }
  
  drawPreview(ctx, color, lineWidth) {
    if (this.points.length < 2) return;
    
    // 绘制路径
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // 如果是等待点击完成状态，使用虚线
    ctx.setLineDash(this.waitingForClick ? [5, 5] : []);
    
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    
    // 如果是闭合路径，绘制闭合线
    if (this.shouldAutoClose && this.points.length >= 3) {
      ctx.lineTo(this.points[0].x, this.points[0].y);
    }
    
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 绘制控制点（可选）
    if (this.points.length < 20) { // 只当点不太多时绘制
      ctx.fillStyle = color;
      this.points.forEach((point, index) => {
        if (index === 0 || index === this.points.length - 1) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }
    
    // 如果处于等待点击状态，显示完成提示
    if (this.waitingForClick && this.points.length >= 3) {
      const firstPoint = this.points[0];
      
      // 绘制明显的完成提示点
      ctx.beginPath();
      ctx.arc(firstPoint.x, firstPoint.y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = '#00ff00';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 绘制闪烁动画
      const time = Date.now() % 1000;
      if (time < 500) {
        ctx.beginPath();
        ctx.arc(firstPoint.x, firstPoint.y, 15, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // 添加文字提示
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Click to complete', firstPoint.x, firstPoint.y - 20);
      ctx.textAlign = 'left';
      
      ctx.lineWidth = lineWidth;
    } 
    // 如果是检测到闭合但还未进入等待点击状态
    else if (this.shouldAutoClose && !this.waitingForClick && this.points.length >= 3) {
      const firstPoint = this.points[0];
      
      // 绘制橙色提示点
      ctx.beginPath();
      ctx.arc(firstPoint.x, firstPoint.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff9900';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 添加文字提示
      ctx.fillStyle = '#ff9900';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('Close detected', firstPoint.x + 10, firstPoint.y - 10);
      
      ctx.lineWidth = lineWidth;
    }
  }
  
  isValid() {
    return this.points.length >= 2;
  }
  
  getAnnotationData(label, color, lineWidth) {
    return this.completeFreehand({ label, color, lineWidth });
  }
  
  reset() {
    super.reset();
    this.shouldAutoClose = false;
    this.isCompleting = false;
    this.waitingForClick = false;
    console.log('Freehand tool reset');
  }
  
  // 获取当前状态（用于调试）
  getState() {
    return {
      type: this.type,
      drawing: this.drawing,
      shouldAutoClose: this.shouldAutoClose,
      isCompleting: this.isCompleting,
      waitingForClick: this.waitingForClick,
      pointsCount: this.points.length
    };
  }
}
