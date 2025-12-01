import React, { useState, useEffect } from 'react';
import { getTree, deleteStudy, deleteSeries, deleteInstance } from '../services/api';

const TreeView = ({ onInstanceSelect, onRefresh, language = 'en' }) => {
  const [treeData, setTreeData] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // 翻译函数
  const t = (key, params = {}) => {
    const translations = {
      en: {
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
      },
      zh: {
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
      }
    };
    
    let translation = translations[language]?.[key] || translations.en[key] || key;
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, params[param]);
    });
    return translation;
  };

  useEffect(() => {
    loadTreeData();
  }, []);

  const loadTreeData = async () => {
    setLoading(true);
    try {
      const response = await getTree();
      setTreeData(response.data);
    } catch (error) {
      console.error('Error loading tree data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleDelete = async (item) => {
    let confirmMessage = t('tree.deleteConfirm', { type: t(`tree.${item.type}`) });
    
    if (item.type === 'study') {
      confirmMessage += ' ' + t('tree.deleteStudyConfirm');
    } else if (item.type === 'series') {
      confirmMessage += ' ' + t('tree.deleteSeriesConfirm');
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      let response;
      switch (item.type) {
        case 'study':
          response = await deleteStudy(item.id);
          break;
        case 'series':
          response = await deleteSeries(item.id);
          break;
        case 'instance':
          response = await deleteInstance(item.id);
          break;
        default:
          return;
      }

      alert(response.data.message);
      // 重新加载数据
      await loadTreeData();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      alert(`Failed to delete ${item.type}: ${error.response?.data?.error || error.message}`);
    }
  };

  const renderItem = (item, level = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    
    let icon = '📁';
    let displayName = '';
    
    switch (item.type) {
      case 'study':
        icon = '📚';
        displayName = `${item.patient_name} (${item.study_date || 'No date'})`;
        break;
      case 'series':
        icon = '📋';
        displayName = `Series ${item.series_number} - ${item.modality}`;
        break;
      case 'instance':
        icon = '🖼️';
        displayName = `Instance ${item.instance_number}`;
        break;
      default:
        displayName = 'Unknown';
    }

    return (
      <div key={item.id} className="tree-item">
        <div 
          className="tree-item-header"
          style={{ paddingLeft: `${level * 20 + 10}px` }}
        >
          {hasChildren && (
            <span 
              className="expand-icon"
              onClick={() => toggleExpand(item.id)}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span className="expand-icon">•</span>}
          
          <span className="item-icon">{icon}</span>
          
          {item.type === 'instance' ? (
            <div className="instance-container">
              <img 
                src={`http://localhost:5000${item.thumbnail_url}`}
                alt={`Instance ${item.instance_number}`}
                className="thumbnail"
                onClick={() => onInstanceSelect && onInstanceSelect(item)}
                title={t('tree.view')}
              />
              <span 
                className="instance-name"
                onClick={() => onInstanceSelect && onInstanceSelect(item)}
                title={t('tree.view')}
              >
                {displayName}
              </span>
            </div>
          ) : (
            <span className="item-name">{displayName}</span>
          )}
          
          <div className="item-actions">
            <span 
              className="delete-btn"
              onClick={() => handleDelete(item)}
              title={t('tree.delete', { type: t(`tree.${item.type}`) })}
            >
              🗑️
            </span>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="tree-children">
            {item.children.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="loading">{t('tree.loading')}</div>;

  return (
    <div className="tree-view">
      <div className="tree-header">
        <h3>{t('tree.title')}</h3>
        <button 
          className="refresh-btn"
          onClick={loadTreeData}
          title={t('tree.refresh')}
        >
          🔄
        </button>
      </div>
      
      {treeData.length === 0 ? (
        <div className="no-data">{t('tree.noData')}</div>
      ) : (
        <div className="tree-content">
          {treeData.map(study => renderItem(study))}
        </div>
      )}
    </div>
  );
};

export default TreeView;
