from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
import traceback
from werkzeug.utils import secure_filename
from datetime import datetime
import pydicom
import numpy as np
from PIL import Image
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# 数据库配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://jwu:abc123@localhost/medical_annotation'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 文件上传配置
UPLOAD_FOLDER = 'uploads'
IMAGE_FOLDER = 'static/images'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(IMAGE_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# 数据库模型
class Study(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    study_uid = db.Column(db.String(64), unique=True, nullable=False)
    patient_name = db.Column(db.String(100))
    study_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    series = db.relationship('Series', backref='study', lazy=True)

class Series(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    series_uid = db.Column(db.String(64), unique=True, nullable=False)
    series_number = db.Column(db.Integer)
    modality = db.Column(db.String(20))
    study_id = db.Column(db.Integer, db.ForeignKey('study.id'), nullable=False)
    instances = db.relationship('Instance', backref='series', lazy=True)

class Instance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    instance_uid = db.Column(db.String(64), unique=True, nullable=False)
    instance_number = db.Column(db.Integer)
    image_path = db.Column(db.String(500))
    series_id = db.Column(db.Integer, db.ForeignKey('series.id'), nullable=False)
    annotations = db.relationship('Annotation', backref='instance', lazy=True)

class Annotation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shape_type = db.Column(db.String(20), nullable=False)
    coordinates = db.Column(db.JSON, nullable=False)
    label = db.Column(db.String(100))
    color = db.Column(db.String(20), default='red')  # 添加颜色字段
    line_width = db.Column(db.Integer, default=2)    # 添加线宽字段
    instance_id = db.Column(db.Integer, db.ForeignKey('instance.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# DICOM工具函数
def extract_dicom_info(dicom_path):
    """提取DICOM文件信息"""
    try:
        ds = pydicom.dcmread(dicom_path, force=True)
        
        def safe_get(attr, default='Unknown'):
            try:
                value = getattr(ds, attr, default)
                if value is None or value == '':
                    return default
                return str(value)
            except:
                return default
        
        patient_name = safe_get('PatientName', 'Unknown Patient')
        
        info = {
            'study_uid': safe_get('StudyInstanceUID', f'1.2.3.{np.random.randint(1000, 9999)}'),
            'series_uid': safe_get('SeriesInstanceUID', f'1.2.3.{np.random.randint(1000, 9999)}.1'),
            'instance_uid': safe_get('SOPInstanceUID', f'1.2.3.{np.random.randint(1000, 9999)}.1.1'),
            'patient_name': patient_name,
            'study_date': safe_get('StudyDate', '20240101'),
            'series_number': int(safe_get('SeriesNumber', '1')),
            'instance_number': int(safe_get('InstanceNumber', '1')),
            'modality': safe_get('Modality', 'OT')
        }
        
        return info, ds
        
    except Exception as e:
        logger.error(f"Error reading DICOM file: {e}")
        info = {
            'study_uid': f'1.2.3.{np.random.randint(1000, 9999)}',
            'series_uid': f'1.2.3.{np.random.randint(1000, 9999)}.1',
            'instance_uid': f'1.2.3.{np.random.randint(1000, 9999)}.1.1',
            'patient_name': 'Test Patient',
            'study_date': '20240101',
            'series_number': 1,
            'instance_number': 1,
            'modality': 'OT'
        }
        return info, None

def convert_dicom_to_image(dicom_data, output_path):
    """将DICOM转换为PNG图像 - 专门处理医学灰度图像"""
    try:
        if dicom_data is None:
            return create_test_image(output_path)
        
        if not hasattr(dicom_data, 'pixel_array'):
            return create_test_image(output_path)
        
        # 获取像素数据
        pixel_array = dicom_data.pixel_array
        
        # 处理多帧数据 - 只取第一帧
        if len(pixel_array.shape) == 3:
            pixel_array = pixel_array[0] if pixel_array.shape[0] > 1 else pixel_array
        
        # 确保是2D灰度图像
        if len(pixel_array.shape) != 2:
            logger.error(f"Unexpected image dimensions: {pixel_array.shape}")
            return create_test_image(output_path)
        
        # 专门处理医学灰度图像
        # 1. 处理有符号数据类型
        if np.issubdtype(pixel_array.dtype, np.signedinteger):
            # 将有符号转换为无符号
            if pixel_array.dtype == np.int16:
                pixel_array = pixel_array.astype(np.uint16)
        
        # 2. 应用窗宽窗位
        try:
            window_center = getattr(dicom_data, 'WindowCenter', None)
            window_width = getattr(dicom_data, 'WindowWidth', None)
            
            if window_center is not None and window_width is not None:
                # 处理多个值的情况
                if hasattr(window_center, '__len__'):
                    window_center = float(window_center[0])
                else:
                    window_center = float(window_center)
                    
                if hasattr(window_width, '__len__'):
                    window_width = float(window_width[0])
                else:
                    window_width = float(window_width)
                
                # 应用窗宽窗位
                window_min = window_center - window_width / 2
                window_max = window_center + window_width / 2
                
                # 裁剪到窗口范围
                pixel_array = np.clip(pixel_array, window_min, window_max)
                # 线性映射到0-255
                pixel_array = ((pixel_array - window_min) / (window_max - window_min) * 255).astype(np.uint8)
            else:
                # 如果没有窗宽窗位，使用自动归一化
                pixel_array = normalize_medical_image(pixel_array)
        except:
            # 如果窗宽窗位处理失败，使用自动归一化
            pixel_array = normalize_medical_image(pixel_array)
        
        # 确保是uint8类型
        if pixel_array.dtype != np.uint8:
            pixel_array = pixel_array.astype(np.uint8)
        
        # 创建灰度图像
        image = Image.fromarray(pixel_array, mode='L')
        
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        image.save(output_path, 'PNG')
        
        logger.info(f"Medical image converted and saved: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error converting DICOM: {e}")
        return create_test_image(output_path)

def normalize_medical_image(pixel_array):
    """归一化医学图像"""
    try:
        # 减去最小值
        min_val = pixel_array.min()
        shifted = pixel_array - min_val
        
        # 计算最大值
        max_val = shifted.max()
        
        if max_val > 0:
            # 归一化到0-255
            normalized = (shifted.astype(np.float32) / max_val * 255)
        else:
            normalized = shifted.astype(np.float32)
        
        return normalized.astype(np.uint8)
    except:
        # 简单归一化作为备选
        return ((pixel_array - pixel_array.min()) / (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)

def create_test_image(output_path):
    """创建测试灰度图像"""
    try:
        width, height = 512, 512
        # 创建医学图像风格的测试图
        image_array = np.random.normal(128, 30, (height, width)).astype(np.uint8)
        
        # 添加一些模拟结构
        y, x = np.ogrid[:height, :width]
        center_y, center_x = height // 2, width // 2
        
        # 模拟病灶
        radius1 = 80
        mask1 = (x - center_x)**2 + (y - center_y)**2 <= radius1**2
        image_array[mask1] = np.clip(image_array[mask1] + 60, 0, 255)
        
        # 模拟小病灶
        radius2 = 30
        center2_x, center2_y = center_x - 120, center_y - 120
        mask2 = (x - center2_x)**2 + (y - center2_y)**2 <= radius2**2
        image_array[mask2] = np.clip(image_array[mask2] - 40, 0, 255)
        
        image = Image.fromarray(image_array, mode='L')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        image.save(output_path, 'PNG')
        return output_path
    except Exception as e:
        logger.error(f"Error creating test image: {e}")
        return None

def create_thumbnail(source_path, thumbnail_path, size=(48, 48)):
    """创建缩略图"""
    try:
        with Image.open(source_path) as img:
            # 保持宽高比生成缩略图
            img.thumbnail(size, Image.Resampling.LANCZOS)
            # 创建白色背景
            background = Image.new('L', size, 255)
            # 计算居中位置
            img_size = img.size
            x = (size[0] - img_size[0]) // 2
            y = (size[1] - img_size[1]) // 2
            # 将图像粘贴到背景上
            background.paste(img, (x, y))
            background.save(thumbnail_path, 'PNG')
            return thumbnail_path
    except Exception as e:
        logger.error(f"Error creating thumbnail: {e}")
        # 如果创建缩略图失败，返回原图路径
        return source_path

# 路由
@app.route('/static/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(IMAGE_FOLDER, filename)

@app.route('/api/upload', methods=['POST'])
def upload_dicom():
    """上传DICOM文件"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.dcm'):
        return jsonify({'error': 'Please upload a DICOM file (.dcm)'}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        file.save(file_path)
    except Exception as e:
        return jsonify({'error': f'Failed to save file: {str(e)}'}), 500
    
    try:
        info, dicom_data = extract_dicom_info(file_path)
        
        # 检查是否已存在
        study = Study.query.filter_by(study_uid=info['study_uid']).first()
        if not study:
            study_date = None
            if info['study_date'] and info['study_date'] != 'Unknown':
                try:
                    study_date = datetime.strptime(info['study_date'], '%Y%m%d').date()
                except:
                    study_date = datetime.now().date()
            else:
                study_date = datetime.now().date()
            
            study = Study(
                study_uid=info['study_uid'],
                patient_name=info['patient_name'],
                study_date=study_date
            )
            db.session.add(study)
            db.session.commit()
        
        series = Series.query.filter_by(series_uid=info['series_uid']).first()
        if not series:
            series = Series(
                series_uid=info['series_uid'],
                series_number=info['series_number'],
                modality=info['modality'],
                study_id=study.id
            )
            db.session.add(series)
            db.session.commit()
        
        # 提前定义变量
        image_filename = None
        thumbnail_filename = None
        
        instance = Instance.query.filter_by(instance_uid=info['instance_uid']).first()
        if not instance:
            image_filename = f"{info['instance_uid']}.png"
            image_path = os.path.join(IMAGE_FOLDER, image_filename)
            
            convert_dicom_to_image(dicom_data, image_path)
            
            # 创建缩略图
            thumbnail_filename = f"{info['instance_uid']}_thumb.png"
            thumbnail_path = os.path.join(IMAGE_FOLDER, thumbnail_filename)
            create_thumbnail(image_path, thumbnail_path)
            
            instance = Instance(
                instance_uid=info['instance_uid'],
                instance_number=info['instance_number'],
                image_path=image_path,
                series_id=series.id
            )
            db.session.add(instance)
            db.session.commit()
        else:
            # 如果实例已存在，使用现有的文件名
            image_filename = os.path.basename(instance.image_path)
            name_without_ext = os.path.splitext(image_filename)[0]
            thumbnail_filename = f"{name_without_ext}_thumb.png"
        
        # 确保变量已赋值
        if not image_filename:
            image_filename = f"{info['instance_uid']}.png"
        if not thumbnail_filename:
            name_without_ext = os.path.splitext(image_filename)[0]
            thumbnail_filename = f"{name_without_ext}_thumb.png"
        
        # 返回完整的实例信息，包括缩略图URL
        instance_data = {
            'id': instance.id,
            'type': 'instance',
            'instance_uid': instance.instance_uid,
            'instance_number': instance.instance_number,
            'image_url': f"/static/images/{image_filename}",
            'thumbnail_url': f"/static/images/{thumbnail_filename}",
            'annotation_count': len(instance.annotations),
            'patient_name': study.patient_name,
            'study_id': study.id,
            'series_id': series.id
        }
        
        return jsonify({
            'message': 'File uploaded successfully',
            'instance': instance_data  # 返回完整的实例信息
        })
        
    except Exception as e:
        logger.error(f"Error processing DICOM file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Failed to process DICOM file: {str(e)}'}), 500

def validate_annotation_data(data):
    """验证标注数据"""
    shape_type = data.get('shape_type')
    coordinates = data.get('coordinates')
    
    if not shape_type or not coordinates:
        return False, "Missing shape_type or coordinates"
    
    valid_shapes = ['rectangle', 'circle', 'ellipse', 'spline', 'freehand']
    if shape_type not in valid_shapes:
        return False, f"Invalid shape_type. Must be one of: {valid_shapes}"
    
    # 验证不同形状的坐标格式
    if shape_type == 'rectangle':
        required_keys = ['x', 'y', 'width', 'height']
        if not all(key in coordinates for key in required_keys):
            return False, "Rectangle requires x, y, width, height"
    
    elif shape_type == 'circle':
        required_keys = ['x', 'y', 'radius']
        if not all(key in coordinates for key in required_keys):
            return False, "Circle requires x, y, radius"
    
    elif shape_type == 'ellipse':
        required_keys = ['x', 'y', 'radiusX', 'radiusY']
        if not all(key in coordinates for key in required_keys):
            return False, "Ellipse requires x, y, radiusX, radiusY"
    
    elif shape_type == 'spline':
        # 样条曲线：点数组
        if not isinstance(coordinates, dict) or 'points' not in coordinates:
            return False, "Spline requires points array"
        if not isinstance(coordinates['points'], list) or len(coordinates['points']) < 3:
            return False, "Spline requires at least 3 points"
    
    elif shape_type == 'freehand':
        # 自由手绘：点数组
        if not isinstance(coordinates, dict) or 'points' not in coordinates:
            return False, "Freehand requires points array"
        if not isinstance(coordinates['points'], list) or len(coordinates['points']) < 2:
            return False, "Freehand requires at least 2 points"
    
    return True, "Valid"

@app.route('/api/studies', methods=['GET'])
def get_studies():
    try:
        studies = Study.query.all()
        result = []
        for study in studies:
            result.append({
                'id': study.id,
                'patient_name': study.patient_name,
                'study_date': study.study_date.isoformat() if study.study_date else None,
                'series_count': len(study.series)
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': 'Failed to get studies'}), 500

@app.route('/api/series/<int:study_id>', methods=['GET'])
def get_series(study_id):
    try:
        series_list = Series.query.filter_by(study_id=study_id).all()
        result = []
        for series in series_list:
            result.append({
                'id': series.id,
                'series_number': series.series_number,
                'modality': series.modality,
                'instance_count': len(series.instances)
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': 'Failed to get series'}), 500

@app.route('/api/instances/<int:series_id>', methods=['GET'])
def get_instances(series_id):
    try:
        instances = Instance.query.filter_by(series_id=series_id).all()
        result = []
        for instance in instances:
            result.append({
                'id': instance.id,
                'instance_number': instance.instance_number,
                'image_url': f"/static/images/{os.path.basename(instance.image_path)}",
                'annotation_count': len(instance.annotations)
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': 'Failed to get instances'}), 500

@app.route('/api/annotations/<int:instance_id>', methods=['POST'])
def create_annotation(instance_id):
    """创建标注"""
    try:
        data = request.json
        
        # 验证数据
        is_valid, message = validate_annotation_data(data)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        # 检查实例是否存在
        instance = Instance.query.get(instance_id)
        if not instance:
            return jsonify({'error': 'Instance not found'}), 404
        
        annotation = Annotation(
            shape_type=data['shape_type'],
            coordinates=data['coordinates'],
            label=data.get('label', f'{data["shape_type"].capitalize()} ROI'),
            color=data.get('color', 'red'),
            line_width=data.get('line_width', 2),
            instance_id=instance_id
        )
        db.session.add(annotation)
        db.session.commit()
        
        return jsonify({
            'message': 'Annotation created',
            'id': annotation.id,
            'annotation': {
                'id': annotation.id,
                'shape_type': annotation.shape_type,
                'coordinates': annotation.coordinates,
                'label': annotation.label,
                'color': annotation.color,
                'line_width': annotation.line_width
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating annotation: {e}")
        return jsonify({'error': f'Failed to create annotation: {str(e)}'}), 500

@app.route('/api/annotations/<int:annotation_id>', methods=['DELETE'])
def delete_annotation(annotation_id):
    try:
        annotation = Annotation.query.get(annotation_id)
        if annotation:
            db.session.delete(annotation)
            db.session.commit()
            return jsonify({'message': 'Annotation deleted'})
        return jsonify({'error': 'Annotation not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to delete annotation'}), 500

@app.route('/api/study/<int:study_id>', methods=['DELETE'])
def delete_study(study_id):
    """删除研究及其所有关联数据"""
    try:
        study = Study.query.get(study_id)
        if not study:
            return jsonify({'error': 'Study not found'}), 404
        
        # 删除所有相关的序列、实例和标注
        for series in study.series:
            for instance in series.instances:
                # 删除实例的标注
                for annotation in instance.annotations:
                    db.session.delete(annotation)
                # 删除实例文件
                if instance.image_path and os.path.exists(instance.image_path):
                    os.remove(instance.image_path)
                db.session.delete(instance)
            db.session.delete(series)
        
        db.session.delete(study)
        db.session.commit()
        
        return jsonify({'message': 'Study deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting study {study_id}: {e}")
        return jsonify({'error': 'Failed to delete study'}), 500

@app.route('/api/series/<int:series_id>', methods=['DELETE'])
def delete_series(series_id):
    """删除序列及其所有关联数据，并清理空的Study"""
    try:
        series = Series.query.get(series_id)
        if not series:
            return jsonify({'error': 'Series not found'}), 404
        
        # 保存父级信息用于后续检查
        study_id = series.study_id
        
        # 删除所有相关的实例和标注
        for instance in series.instances:
            # 删除实例的标注
            for annotation in instance.annotations:
                db.session.delete(annotation)
            # 删除实例文件
            if instance.image_path and os.path.exists(instance.image_path):
                os.remove(instance.image_path)
            db.session.delete(instance)
        
        db.session.delete(series)
        db.session.commit()
        
        # 检查Study是否为空，如果为空则删除
        study = Study.query.get(study_id)
        if study and len(study.series) == 0:
            db.session.delete(study)
            db.session.commit()
            logger.info(f"Auto-deleted empty study: {study_id}")
        
        return jsonify({'message': 'Series deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting series {series_id}: {e}")
        return jsonify({'error': 'Failed to delete series'}), 500

@app.route('/api/instance/<int:instance_id>', methods=['DELETE'])
def delete_instance(instance_id):
    """删除实例及其标注，并清理空的Series和Study"""
    try:
        instance = Instance.query.get(instance_id)
        if not instance:
            return jsonify({'error': 'Instance not found'}), 404
        
        # 保存父级信息用于后续检查
        series_id = instance.series_id
        study_id = instance.series.study_id
        
        # 删除所有标注
        for annotation in instance.annotations:
            db.session.delete(annotation)
        
        # 删除图像文件
        if instance.image_path and os.path.exists(instance.image_path):
            os.remove(instance.image_path)
        
        db.session.delete(instance)
        db.session.commit()
        
        # 检查Series是否为空，如果为空则删除
        series = Series.query.get(series_id)
        if series and len(series.instances) == 0:
            db.session.delete(series)
            db.session.commit()
            logger.info(f"Auto-deleted empty series: {series_id}")
            
            # 检查Study是否为空，如果为空则删除
            study = Study.query.get(study_id)
            if study and len(study.series) == 0:
                db.session.delete(study)
                db.session.commit()
                logger.info(f"Auto-deleted empty study: {study_id}")
        
        return jsonify({'message': 'Instance deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting instance {instance_id}: {e}")
        return jsonify({'error': 'Failed to delete instance'}), 500

@app.route('/api/tree', methods=['GET'])
def get_tree():
    """获取完整的树状结构数据"""
    try:
        studies = Study.query.all()
        result = []
        
        for study in studies:
            study_data = {
                'id': study.id,
                'type': 'study',
                'study_uid': study.study_uid,
                'patient_name': study.patient_name,
                'study_date': study.study_date.isoformat() if study.study_date else None,
                'children': []
            }
            
            for series in study.series:
                series_data = {
                    'id': series.id,
                    'type': 'series',
                    'series_uid': series.series_uid,
                    'series_number': series.series_number,
                    'modality': series.modality,
                    'children': []
                }
                
                for instance in series.instances:
                    # 生成缩略图文件名
                    base_name = os.path.basename(instance.image_path)
                    name_without_ext = os.path.splitext(base_name)[0]
                    thumbnail_filename = f"{name_without_ext}_thumb.png"
                    thumbnail_path = os.path.join(IMAGE_FOLDER, thumbnail_filename)
                    
                    # 如果缩略图不存在，创建它
                    if not os.path.exists(thumbnail_path):
                        create_thumbnail(instance.image_path, thumbnail_path)
                    
                    instance_data = {
                        'id': instance.id,
                        'type': 'instance',
                        'instance_uid': instance.instance_uid,
                        'instance_number': instance.instance_number,
                        'image_url': f"/static/images/{base_name}",
                        'thumbnail_url': f"/static/images/{thumbnail_filename}",
                        'annotation_count': len(instance.annotations),
                        'patient_name': study.patient_name
                    }
                    series_data['children'].append(instance_data)
                
                study_data['children'].append(series_data)
            
            result.append(study_data)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting tree data: {e}")
        return jsonify({'error': 'Failed to get tree data'}), 500

@app.route('/api/create-test-data', methods=['POST'])
def create_test_data():
    """创建测试数据"""
    try:
        # 创建一个测试研究
        study = Study(
            study_uid='1.2.3.4.5',
            patient_name='Test Patient',
            study_date=datetime.now().date()
        )
        db.session.add(study)
        db.session.commit()

        # 创建测试序列
        series = Series(
            series_uid='1.2.3.4.5.1',
            series_number=1,
            modality='CT',
            study_id=study.id
        )
        db.session.add(series)
        db.session.commit()

        # 创建测试实例
        instance = Instance(
            instance_uid='1.2.3.4.5.1.1',
            instance_number=1,
            image_path='static/images/test_image.png',
            series_id=series.id
        )
        db.session.add(instance)
        db.session.commit()

        return jsonify({
            'message': 'Test data created', 
            'study_id': study.id,
            'instance_id': instance.id
        })
    
    except Exception as e:
        logger.error(f"Error creating test data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/api/simple-upload', methods=['POST'])
def simple_upload():
    """简化的上传接口，不解析DICOM"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        import uuid
        # 生成唯一ID
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.dcm"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # 创建对应的测试图像
        image_filename = f"{file_id}.png"
        image_path = os.path.join(IMAGE_FOLDER, image_filename)
        
        create_test_image(image_path)
        
        return jsonify({
            'message': 'File uploaded successfully (simplified)',
            'image_url': f"/static/images/{image_filename}",
            'file_id': file_id
        })
    except Exception as e:
        logger.error(f"Error in simple upload: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/annotations/<int:annotation_id>', methods=['PUT'])
def update_annotation(annotation_id):
    """更新标注"""
    try:
        annotation = Annotation.query.get(annotation_id)
        if not annotation:
            return jsonify({'error': 'Annotation not found'}), 404
        
        data = request.json
        if 'coordinates' in data:
            annotation.coordinates = data['coordinates']
        if 'label' in data:
            annotation.label = data['label']
        if 'color' in data:
            annotation.color = data['color']
        if 'line_width' in data:
            annotation.line_width = data['line_width']
        
        db.session.commit()
        return jsonify({'message': 'Annotation updated', 'id': annotation.id})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating annotation {annotation_id}: {e}")
        return jsonify({'error': 'Failed to update annotation'}), 500

# 初始化数据库
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
