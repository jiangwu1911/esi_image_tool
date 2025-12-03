// BaseAnnotationTool.js - 基础标注工具类
export class BaseAnnotationTool {
  constructor() {
    this.type = 'base';
    this.drawing = false;
    this.points = [];
    this.startPoint = null;
    this.currentPoint = null;
  }
  
  // 鼠标按下事件
  onMouseDown(point, context) {
    // 由子类实现
  }
  
  // 鼠标移动事件
  onMouseMove(point, context) {
    // 由子类实现
  }
  
  // 鼠标释放事件
  onMouseUp(point, context) {
    // 由子类实现
  }
  
  // 双击事件
  onDoubleClick(point, context) {
    // 由子类实现
  }
  
  // 绘制标注
  draw(ctx, color, lineWidth) {
    // 由子类实现
  }
  
  // 绘制预览
  drawPreview(ctx, color, lineWidth) {
    // 由子类实现
  }
  
  // 验证标注是否有效
  isValid() {
    // 由子类实现
    return false;
  }
  
  // 获取标注数据
  getAnnotationData(label, color, lineWidth) {
    // 由子类实现
    return null;
  }
  
  // 重置状态
  reset() {
    this.drawing = false;
    this.points = [];
    this.startPoint = null;
    this.currentPoint = null;
  }
  
  // 工具方法：计算两点距离
  static pointDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
  
  // 工具方法：简化路径
  static simplifyPath(points, epsilon = 2.0) {
    if (points.length < 3) return points;
    
    const perpendicularDistance = (point, lineStart, lineEnd) => {
      const area = Math.abs(
        (lineEnd.y - lineStart.y) * point.x -
        (lineEnd.x - lineStart.x) * point.y +
        lineEnd.x * lineStart.y -
        lineEnd.y * lineStart.x
      );
      
      const lineLength = Math.sqrt(
        Math.pow(lineEnd.x - lineStart.x, 2) + 
        Math.pow(lineEnd.y - lineStart.y, 2)
      );
      
      return lineLength > 0 ? area / lineLength : 0;
    };
    
    const findFurthestPoint = (points, start, end) => {
      let maxDistance = 0;
      let furthestIndex = start;
      const startPoint = points[start];
      const endPoint = points[end];
      
      for (let i = start + 1; i < end; i++) {
        const distance = perpendicularDistance(points[i], startPoint, endPoint);
        if (distance > maxDistance) {
          maxDistance = distance;
          furthestIndex = i;
        }
      }
      
      return { index: furthestIndex, distance: maxDistance };
    };
    
    const simplifySegment = (points, start, end, epsilon, result) => {
      const { index, distance } = findFurthestPoint(points, start, end);
      
      if (distance > epsilon) {
        simplifySegment(points, start, index, epsilon, result);
        result.push(points[index]);
        simplifySegment(points, index, end, epsilon, result);
      }
    };
    
    const result = [points[0]];
    simplifySegment(points, 0, points.length - 1, epsilon, result);
    result.push(points[points.length - 1]);
    
    return result;
  }
  
  // 工具方法：计算路径长度
  static calculatePathLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }
  
  // 工具方法：计算闭合路径面积
  static calculatePathArea(points) {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area) / 2;
  }
}
