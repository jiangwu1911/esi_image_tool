import { useState, useEffect, useCallback } from 'react';

// 翻译字典
const translations = {
  en: {
    // 应用标题
    'app.title': 'Medical Image Annotation Tool',
    'app.welcome.title': 'Welcome to Medical Image Annotation Tool',
    'app.welcome.message': 'Please upload a DICOM file to get started, or select an instance from the tree view.',
    
    // 文件上传
    'upload.title': 'Upload DICOM File',
    'upload.button': 'Choose DICOM File',
    'upload.uploading': 'Uploading...',
    'upload.success': 'Upload successful!',
    'upload.error': 'Upload failed: ',
    'upload.invalid': 'Please select a DICOM file (.dcm)',
    
    // 树状视图
    'tree.title': 'Studies Tree',
    'tree.refresh': 'Refresh tree',
    'tree.noData': 'No studies found. Upload a DICOM file to get started.',
    'tree.loading': 'Loading tree data...',
    'tree.deleteConfirm': 'Are you sure you want to delete this {type}?',
    'tree.deleteStudyConfirm': 'This will delete all associated series and instances.',
    'tree.deleteSeriesConfirm': 'This will delete all associated instances.',
    'tree.view': 'View this instance',
    'tree.delete': 'Delete this {type}',
    'tree.study': 'study',
    'tree.series': 'series',
    'tree.instance': 'instance',
    
    // 标注工具
    'tools.title': 'Annotation Tools',
    'tools.shapes': 'Shapes',
    'tools.rectangle': 'Rectangle',
    'tools.circle': 'Circle',
    'tools.ellipse': 'Ellipse',
    'tools.select': 'Select/Move',
    'tools.lineWidth': 'Line Width',
    'tools.color': 'Color',
    'tools.instructions': 'Instructions',
    'tools.instruction1': 'Select shape tools to draw on the image',
    'tools.instruction2': 'Select "Select/Move" tool to select and move annotations',
    'tools.instruction3': 'Click annotation to select, drag to move position',
    'tools.instruction4': 'Press Delete key to delete selected annotation',
    'tools.instruction5': 'Press ESC key to cancel selection',
    'tools.instruction6': 'Annotations need at least 5 pixels to be created',
    
    // 颜色
    'color.red': 'Red',
    'color.blue': 'Blue',
    'color.green': 'Green',
    'color.yellow': 'Yellow',
    'color.purple': 'Purple',
    'color.orange': 'Orange',
    
    // 图像查看器
    'viewer.selected': 'Selected: {label}',
    'viewer.instructions': '(Drag to move, Delete to remove, ESC to cancel)',
    'viewer.loading': 'Loading image...',
  },
  
  zh: {
    // 应用标题
    'app.title': '医学图像标注工具',
    'app.welcome.title': '欢迎使用医学图像标注工具',
    'app.welcome.message': '请上传DICOM文件开始使用，或从树状图中选择实例。',
    
    // 文件上传
    'upload.title': '上传DICOM文件',
    'upload.button': '选择DICOM文件',
    'upload.uploading': '上传中...',
    'upload.success': '上传成功！',
    'upload.error': '上传失败：',
    'upload.invalid': '请选择DICOM文件 (.dcm)',
    
    // 树状视图
    'tree.title': '研究树状图',
    'tree.refresh': '刷新树状图',
    'tree.noData': '未找到研究。请上传DICOM文件开始使用。',
    'tree.loading': '加载树状数据中...',
    'tree.deleteConfirm': '确定要删除这个{type}吗？',
    'tree.deleteStudyConfirm': '这将删除所有相关的序列和实例。',
    'tree.deleteSeriesConfirm': '这将删除所有相关的实例。',
    'tree.view': '查看此实例',
    'tree.delete': '删除此{type}',
    'tree.study': '研究',
    'tree.series': '序列',
    'tree.instance': '实例',
    
    // 标注工具
    'tools.title': '标注工具',
    'tools.shapes': '形状',
    'tools.rectangle': '矩形',
    'tools.circle': '圆形',
    'tools.ellipse': '椭圆',
    'tools.select': '选择/移动',
    'tools.lineWidth': '线宽',
    'tools.color': '颜色',
    'tools.instructions': '使用说明',
    'tools.instruction1': '选择形状工具在图像上绘制',
    'tools.instruction2': '选择"选择/移动"工具来选择和移动标注',
    'tools.instruction3': '点击标注选中，拖动移动位置',
    'tools.instruction4': '按Delete键删除选中的标注',
    'tools.instruction5': '按ESC键取消选择',
    'tools.instruction6': '标注需要至少5像素大小才能创建',
    
    // 颜色
    'color.red': '红色',
    'color.blue': '蓝色',
    'color.green': '绿色',
    'color.yellow': '黄色',
    'color.purple': '紫色',
    'color.orange': '橙色',
    
    // 图像查看器
    'viewer.selected': '已选中：{label}',
    'viewer.instructions': '(拖动移动，Delete删除，ESC取消)',
    'viewer.loading': '加载图像中...',
  }
};

export const useTranslation = () => {
  const [language, setLanguage] = useState('en');

  // 从本地存储加载语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language');
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    }
  }, []);

  // 保存语言设置到本地存储
  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('app-language', lang);
    }
  };

  // 翻译函数
  const t = useCallback((key, params = {}) => {
    let translation = translations[language]?.[key] || translations['en'][key] || key;
    
    // 替换参数
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, params[param]);
    });
    
    return translation;
  }, [language]);

  return {
    t,
    language,
    setLanguage: changeLanguage
  };
};
