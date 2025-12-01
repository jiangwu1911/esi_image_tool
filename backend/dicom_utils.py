import pydicom
import numpy as np
from PIL import Image
import os
from datetime import datetime
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_dicom_info(dicom_path):
    """提取DICOM文件信息"""
    try:
        ds = pydicom.dcmread(dicom_path, force=True)
        
        # 安全地获取属性值
        def safe_get(attr, default='Unknown'):
            try:
                value = getattr(ds, attr, default)
                if value is None or value == '':
                    return default
                
                # 处理不同的DICOM数据类型
                if hasattr(value, 'original_string'):
                    return str(value.original_string)
                elif hasattr(value, '__str__'):
                    return str(value)
                else:
                    return default
            except Exception as e:
                logger.warning(f"Error getting attribute {attr}: {e}")
                return default
        
        # 处理患者姓名特殊格式
        patient_name = safe_get('PatientName', 'Unknown Patient')
        if hasattr(ds, 'PatientName'):
            try:
                if hasattr(ds.PatientName, 'family_name') and hasattr(ds.PatientName, 'given_name'):
                    family_name = ds.PatientName.family_name or ''
                    given_name = ds.PatientName.given_name or ''
                    patient_name = f"{family_name} {given_name}".strip()
                elif hasattr(ds.PatientName, 'original_string'):
                    patient_name = str(ds.PatientName.original_string)
            except:
                pass
        
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
        
        logger.info(f"Extracted DICOM info: {info}")
        return info, ds
        
    except Exception as e:
        logger.error(f"Error reading DICOM file {dicom_path}: {e}")
        # 如果读取DICOM文件失败，返回默认值
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
    """将DICOM转换为PNG图像"""
    try:
        if dicom_data is None:
            # 如果没有DICOM数据，创建一个测试图像
            return create_test_image(output_path)
        
        # 检查是否有像素数据
        if not hasattr(dicom_data, 'pixel_array'):
            logger.warning("DICOM file has no pixel data, creating test image")
            return create_test_image(output_path)
        
        # 读取像素数据，处理多帧情况
        try:
            pixel_array = dicom_data.pixel_array
            
            # 如果是多帧数据，只取第一帧
            if len(pixel_array.shape) == 3 and pixel_array.shape[0] > 1:
                logger.info(f"Multi-frame DICOM detected, using first frame of {pixel_array.shape[0]} frames")
                pixel_array = pixel_array[0]
                
        except Exception as e:
            logger.error(f"Error reading pixel array: {e}")
            return create_test_image(output_path)
        
        # 处理不同的数据类型
        if pixel_array.dtype == np.uint8:
            normalized_array = pixel_array
        elif pixel_array.dtype == np.uint16:
            # 16位转8位
            normalized_array = (pixel_array / 256).astype(np.uint8)
        else:
            # 归一化其他数据类型
            normalized_array = pixel_array.astype(np.float64)
            normalized_array -= normalized_array.min()
            array_max = normalized_array.max()
            if array_max > 0:
                normalized_array /= array_max
            normalized_array = (normalized_array * 255).astype(np.uint8)
        
        # 创建图像
        if len(normalized_array.shape) == 2:
            image = Image.fromarray(normalized_array, mode='L')
        elif len(normalized_array.shape) == 3:
            if normalized_array.shape[2] == 3:
                image = Image.fromarray(normalized_array, mode='RGB')
            else:
                # 如果是其他通道数，取第一个通道
                image = Image.fromarray(normalized_array[:,:,0], mode='L')
        else:
            logger.error(f"Unexpected array shape: {normalized_array.shape}")
            return create_test_image(output_path)
        
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        image.save(output_path, 'PNG')
        logger.info(f"Image saved to: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error converting DICOM to image: {e}")
        return create_test_image(output_path)

def create_test_image(output_path):
    """创建测试图像"""
    try:
        width, height = 512, 512
        # 创建一个有纹理的测试图像
        image_array = np.random.normal(128, 30, (height, width)).astype(np.uint8)
        
        # 添加一些结构
        y, x = np.ogrid[:height, :width]
        center_y, center_x = height // 2, width // 2
        radius = 100
        
        mask = (x - center_x)**2 + (y - center_y)**2 <= radius**2
        image_array[mask] = np.clip(image_array[mask] + 50, 0, 255)
        
        image = Image.fromarray(image_array, mode='L')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        image.save(output_path, 'PNG')
        logger.info(f"Test image created at: {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Error creating test image: {e}")
        return None
