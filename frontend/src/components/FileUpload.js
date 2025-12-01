import React, { useState } from 'react';
import { uploadDicom } from '../services/api';

const FileUpload = ({ onUploadSuccess, onInstanceSelect, language = 'en' }) => {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  // 简单的翻译函数
  const t = (key) => {
    const translations = {
      en: {
        'upload.title': 'Upload DICOM File',
        'upload.button': 'Choose DICOM File',
        'upload.uploading': 'Uploading...',
        'upload.success': 'Upload successful!',
        'upload.invalid': 'Please select a DICOM file (.dcm)',
      },
      zh: {
        'upload.title': '上传DICOM文件',
        'upload.button': '选择DICOM文件',
        'upload.uploading': '上传中...',
        'upload.success': '上传成功！',
        'upload.invalid': '请选择DICOM文件 (.dcm)',
      }
    };
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.dcm')) {
      setMessage(t('upload.invalid'));
      return;
    }

    setUploading(true);
    setMessage(t('upload.uploading'));

    try {
      const response = await uploadDicom(file);
      setMessage(t('upload.success'));
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
      // 自动选择新上传的实例
      if (onInstanceSelect && response.data.instance) {
        onInstanceSelect(response.data.instance);
      }
      
      // 清空文件输入，允许重复选择同一文件
      event.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <h3>{t('upload.title')}</h3>
      <div className="upload-area">
        <input
          type="file"
          id="dicom-upload"
          accept=".dcm"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <label htmlFor="dicom-upload" className="upload-button">
          {uploading ? t('upload.uploading') : t('upload.button')}
        </label>
        {message && (
          <div className={`message ${message.includes('failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
