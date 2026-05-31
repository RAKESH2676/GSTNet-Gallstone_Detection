import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Tag, Button, Space, Typography, Tooltip, Empty, Row, Col, message, Modal } from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const History = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  
  // Filter States
  const [searchText, setSearchText] = useState('');
  const [predictionFilter, setPredictionFilter] = useState(undefined);
  const [genderFilter, setGenderFilter] = useState(undefined);
  
  // Sort States
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  const navigate = useNavigate();

  // Read logged-in user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('gstnet_user') || '{}');
  const isPatient = currentUser.role === 'patient';

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchText) params.search = searchText;
      if (predictionFilter) params.prediction = predictionFilter;
      if (genderFilter) params.gender = genderFilter;
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;

      // Patients only see their own records
      if (isPatient && currentUser.patient_id) {
        params.patient_id = currentUser.patient_id;
      }

      const response = await axios.get('http://localhost:5000/api/history', { params });
      if (response.data.success) {
        setHistory(response.data.history);
      }
    } catch (err) {
      console.error('History loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on filter update
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchHistory();
    }, 400); // Debounce text search
    return () => clearTimeout(delayDebounce);
  }, [searchText, predictionFilter, genderFilter, sortBy, sortOrder]);

  const handleResetFilters = () => {
    setSearchText('');
    setPredictionFilter(undefined);
    setGenderFilter(undefined);
    setSortBy('timestamp');
    setSortOrder('desc');
  };

  const handleDelete = (predictionId) => {
    confirm({
      title: `Delete Record RUN-${predictionId.toString().padStart(5, '0')}?`,
      icon: <ExclamationCircleOutlined />,
      content: 'This will permanently remove the prediction record, scan images, heatmap, and PDF report. This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          const response = await axios.delete(`http://localhost:5000/api/delete-prediction/${predictionId}`);
          if (response.data.success) {
            message.success(response.data.message);
            fetchHistory();
          }
        } catch (err) {
          message.error(err.response?.data?.message || "Failed to delete record.");
        }
      }
    });
  };

  const columns = [
    {
      title: 'Run ID',
      dataIndex: 'prediction_id',
      key: 'prediction_id',
      sorter: true,
      width: 130,
      render: (id) => (
        <Text strong style={{ 
          background: '#f0f7ff', 
          padding: '2px 8px', 
          borderRadius: 4, 
          fontSize: 12,
          fontFamily: 'monospace'
        }}>
          RUN-{id.toString().padStart(5, '0')}
        </Text>
      )
    },
    {
      title: 'Patient Name',
      dataIndex: ['patient', 'patient_name'],
      key: 'patient_name',
      sorter: true,
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'Age',
      dataIndex: ['patient', 'age'],
      key: 'age',
      width: 80,
      render: (age) => <Text>{age} yrs</Text>
    },
    {
      title: 'Gender',
      dataIndex: ['patient', 'gender'],
      key: 'gender',
      width: 90,
      render: (gender) => <Text>{gender}</Text>
    },
    {
      title: 'Findings Result',
      dataIndex: 'prediction',
      key: 'prediction',
      width: 140,
      render: (pred) => (
        <Tag 
          color={pred === 'Gallstone' ? 'error' : 'success'} 
          style={{ fontWeight: 'bold', borderRadius: 6 }}
        >
          {pred === 'Gallstone' ? '⚠ GALLSTONE' : '✓ NORMAL'}
        </Tag>
      )
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      sorter: true,
      width: 140,
      render: (conf) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 50, 
            height: 6, 
            background: '#e8ecf1', 
            borderRadius: 3, 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              width: `${conf * 100}%`, 
              height: '100%', 
              background: conf >= 0.8 ? '#10b981' : conf >= 0.6 ? '#f59e0b' : '#ef4444',
              borderRadius: 3 
            }} />
          </div>
          <Text style={{ fontSize: 12, fontWeight: 600 }}>{(conf * 100).toFixed(1)}%</Text>
        </div>
      )
    },
    {
      title: 'Diagnosis Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: true,
      render: (time) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(time).toLocaleDateString()} {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space>
          <Tooltip title="Review images and analytics">
            <Button 
              type="primary" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => navigate('/upload', { state: { predictionResult: record } })}
              style={{ borderRadius: 6 }}
            >
              Review
            </Button>
          </Tooltip>
          {record.report_path && (
            <Tooltip title="Download PDF Report">
              <Button 
                type="default" 
                size="small" 
                icon={<DownloadOutlined />}
                href={`http://localhost:5000${record.report_path}`}
                target="_blank"
                style={{ borderRadius: 6 }}
              >
                PDF
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Delete record">
            <Button 
              type="text" 
              size="small" 
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.prediction_id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Handle table sorting changes
  const handleTableChange = (pagination, filters, sorter) => {
    if (sorter.columnKey) {
      setSortBy(sorter.columnKey === 'patient_name' ? 'patient_name' : sorter.columnKey);
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Title level={2} style={{ color: '#0f52ba', fontFamily: 'Outfit', margin: 0 }}>
        Clinical Diagnostic Registries
      </Title>

      {/* Role scope banner */}
      {isPatient ? (
        <div style={{
          background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
          border: '1px solid #bfdbfe', borderRadius: 12,
          padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <TeamOutlined style={{ color: '#1d4ed8', fontSize: 18 }} />
          <Text style={{ color: '#1e40af', fontSize: 13.5 }}>
            <b>Patient View</b> — Showing only your scan history ({currentUser.username})
          </Text>
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
          border: '1px solid #c4b5fd', borderRadius: 12,
          padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <SafetyCertificateOutlined style={{ color: '#7c3aed', fontSize: 18 }} />
          <Text style={{ color: '#6d28d9', fontSize: 13.5 }}>
            <b>Admin View</b> — Full access to all patient diagnostic records
          </Text>
        </div>
      )}

      {/* --- FILTER CONTROL PANEL --- */}
      <Card className="filter-bar" bodyStyle={{ padding: '16px 20px' }}>
        <Row gutter={[16, 16]} align="middle">
          
          {/* Search bar */}
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder="Search patient by name..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="large"
              style={{ borderRadius: 8 }}
              allowClear
            />
          </Col>
          
          {/* Findings Filter */}
          <Col xs={12} sm={5} md={5}>
            <Select
              placeholder="Finding Outcome"
              style={{ width: '100%' }}
              value={predictionFilter}
              onChange={setPredictionFilter}
              size="large"
              allowClear
            >
              <Option value="Normal">Normal</Option>
              <Option value="Gallstone">Gallstone</Option>
            </Select>
          </Col>
          
          {/* Gender Filter */}
          <Col xs={12} sm={5} md={5}>
            <Select
              placeholder="Patient Gender"
              style={{ width: '100%' }}
              value={genderFilter}
              onChange={setGenderFilter}
              size="large"
              allowClear
            >
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Col>

          {/* Reset Filters */}
          <Col xs={24} sm={4} md={6} style={{ textAlign: 'right' }}>
            <Button 
              type="dashed" 
              icon={<ReloadOutlined />} 
              onClick={handleResetFilters}
              size="large"
              style={{ borderRadius: 8 }}
            >
              Reset
            </Button>
          </Col>

        </Row>
      </Card>

      {/* --- REGISTRY LOGS TABLE --- */}
      <Card>
        <Table
          dataSource={history}
          columns={columns}
          rowKey="prediction_id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{ 
            defaultPageSize: 8,
            showSizeChanger: true,
            pageSizeOptions: ['5', '8', '15', '30'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`
          }}
          locale={{ emptyText: <Empty description="No diagnostic profiles match your query." /> }}
          rowClassName={(record) => record.prediction === 'Gallstone' ? 'gallstone-row' : ''}
        />
      </Card>
    </div>
  );
};

export default History;
