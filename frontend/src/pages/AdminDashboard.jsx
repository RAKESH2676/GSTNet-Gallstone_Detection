import React, { useState, useEffect } from 'react';
import {
  Table, Card, Input, Select, Tag, Button, Space, Typography, Tooltip, Empty,
  Row, Col, message, Modal, Tabs
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('patients');
  const [loading, setLoading] = useState(true);

  // Patients Registry States
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientGender, setPatientGender] = useState(undefined);
  const [patientSortBy, setPatientSortBy] = useState('created_at');
  const [patientSortOrder, setPatientSortOrder] = useState('desc');

  // Predictions Log States
  const [predictions, setPredictions] = useState([]);
  const [predSearch, setPredSearch] = useState('');
  const [predOutcome, setPredOutcome] = useState(undefined);
  const [predGender, setPredGender] = useState(undefined);
  const [predSortBy, setPredSortBy] = useState('timestamp');
  const [predSortOrder, setPredSortOrder] = useState('desc');

  const navigate = useNavigate();

  // Fetch Patients List
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = {
        sortBy: patientSortBy,
        sortOrder: patientSortOrder
      };
      if (patientSearch) params.search = patientSearch;
      if (patientGender) params.gender = patientGender;

      const response = await axios.get(getApiUrl('/api/admin/patients'), { params });
      if (response.data.success) {
        setPatients(response.data.patients);
      }
    } catch (err) {
      console.error('Error loading patients:', err);
      message.error(err.response?.data?.message || 'Failed to read patient records.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Predictions Log
  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const params = {
        sortBy: predSortBy,
        sortOrder: predSortOrder
      };
      if (predSearch) params.search = predSearch;
      if (predOutcome) params.prediction = predOutcome;
      if (predGender) params.gender = predGender;

      const response = await axios.get(getApiUrl('/api/admin/predictions'), { params });
      if (response.data.success) {
        setPredictions(response.data.predictions);
      }
    } catch (err) {
      console.error('Error loading predictions:', err);
      message.error(err.response?.data?.message || 'Failed to read prediction records.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger query re-fetches when activeTab or filter states change
  useEffect(() => {
    if (activeTab === 'patients') {
      const delayDebounce = setTimeout(() => {
        fetchPatients();
      }, 350);
      return () => clearTimeout(delayDebounce);
    } else {
      const delayDebounce = setTimeout(() => {
        fetchPredictions();
      }, 350);
      return () => clearTimeout(delayDebounce);
    }
  }, [
    activeTab,
    patientSearch, patientGender, patientSortBy, patientSortOrder,
    predSearch, predOutcome, predGender, predSortBy, predSortOrder
  ]);

  // Reset Filters Helpers
  const handleResetPatients = () => {
    setPatientSearch('');
    setPatientGender(undefined);
    setPatientSortBy('created_at');
    setPatientSortOrder('desc');
  };

  const handleResetPredictions = () => {
    setPredSearch('');
    setPredOutcome(undefined);
    setPredGender(undefined);
    setPredSortBy('timestamp');
    setPredSortOrder('desc');
  };

  // Delete Patient Cascade Handler
  const handleDeletePatient = (patientId, name) => {
    confirm({
      title: `Delete Patient Profile: ${name}?`,
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: 'CRITICAL CASCADE ACTION: This will permanently delete the patient profile AND all associated diagnostic logs, scan files (ultrasound images), heatmaps, and PDF reports from the server. This action is irreversible.',
      okText: 'Confirm Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          const response = await axios.delete(getApiUrl(`/api/admin/delete-patient/${patientId}`));
          if (response.data.success) {
            message.success(response.data.message);
            fetchPatients();
          }
        } catch (err) {
          message.error(err.response?.data?.message || 'Failed to delete patient profile.');
        }
      }
    });
  };

  // Delete Prediction Record Handler
  const handleDeletePrediction = (predictionId) => {
    confirm({
      title: `Delete Diagnostic Log RUN-${predictionId.toString().padStart(5, '0')}?`,
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: 'This will permanently remove the prediction record, scan images, heatmap, and PDF report from the server. This action is irreversible.',
      okText: 'Delete Log',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          const response = await axios.delete(getApiUrl(`/api/admin/delete-prediction/${predictionId}`));
          if (response.data.success) {
            message.success(response.data.message);
            fetchPredictions();
          }
        } catch (err) {
          message.error(err.response?.data?.message || 'Failed to delete prediction record.');
        }
      }
    });
  };

  // Dynamic sorting handlers
  const handlePatientTableChange = (pagination, filters, sorter) => {
    if (sorter.columnKey) {
      setPatientSortBy(sorter.columnKey);
      setPatientSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  const handlePredTableChange = (pagination, filters, sorter) => {
    if (sorter.columnKey) {
      setPredSortBy(sorter.columnKey);
      setPredSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  // Tables Column Definitions
  const patientColumns = [
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
      sorter: true,
      width: 120,
      render: (id) => (
        <Text strong style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
          PAT-{id.toString().padStart(4, '0')}
        </Text>
      )
    },
    {
      title: 'Full Name',
      dataIndex: 'patient_name',
      key: 'patient_name',
      sorter: true,
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      width: 100,
      render: (gender) => <Text>{gender}</Text>
    },
    {
      title: 'Date of Birth',
      dataIndex: 'date_of_birth',
      key: 'date_of_birth',
      render: (dob) => dob ? <Text>{new Date(dob).toLocaleDateString()}</Text> : <Text type="secondary">—</Text>
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      sorter: true,
      width: 90,
      render: (age) => <Text>{age} yrs</Text>
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: true,
      render: (time) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} {new Date(time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</Text>
    },
    {
      title: 'Actions',
      key: 'action',
      width: 110,
      render: (_, record) => (
        <Tooltip title="Delete patient profile & all associated diagnostics">
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeletePatient(record.patient_id, record.patient_name)}
          />
        </Tooltip>
      )
    }
  ];

  const predictionColumns = [
    {
      title: 'Case ID',
      dataIndex: 'prediction_id',
      key: 'prediction_id',
      sorter: true,
      width: 130,
      render: (id) => (
        <Text strong style={{ background: '#f0f7ff', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>
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
      title: 'Report ID',
      dataIndex: 'report_id',
      key: 'report_id',
      render: (id) => id ? <Text style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{id}</Text> : <Text type="secondary">—</Text>
    },
    {
      title: 'Diagnosis Findings',
      dataIndex: 'prediction',
      key: 'prediction',
      width: 150,
      render: (pred) => (
        <Tag color={pred === 'Gallstone' ? 'error' : 'success'} style={{ fontWeight: 'bold', borderRadius: 6 }}>
          {pred === 'Gallstone' ? '⚠ GALLSTONE' : '✓ NORMAL'}
        </Tag>
      )
    },
    {
      title: 'GSTNet Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      sorter: true,
      width: 160,
      render: (conf) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 60, height: 6, background: '#e8ecf1', borderRadius: 3, overflow: 'hidden' }}>
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
      title: 'Date Logged',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: true,
      render: (time) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} {new Date(time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</Text>
    },
    {
      title: 'Actions',
      key: 'action',
      width: 200,
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
                href={getApiUrl(record.report_path)}
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
              onClick={() => handleDeletePrediction(record.prediction_id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ color: '#0f52ba', fontFamily: 'Outfit', margin: 0 }}>
            System Administration Console
          </Title>
          <Text type="secondary" style={{ fontSize: 13.5 }}>
            Secure registry tables and records management for authorized clinical directors
          </Text>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          border: '1px solid #fca5a5', borderRadius: 10,
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <SafetyCertificateOutlined style={{ color: '#dc2626', fontSize: 16 }} />
          <Text strong style={{ color: '#991b1b', fontSize: 12.5 }}>ADMIN PRIVILEGES ACTIVE</Text>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'patients',
            label: (
              <span>
                <TeamOutlined />
                Patients Database ({patients.length})
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Patients Filter Panel */}
                <Card className="filter-bar" bodyStyle={{ padding: '16px 20px' }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={12}>
                      <Input
                        placeholder="Search patient profiles by name..."
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        size="large"
                        style={{ borderRadius: 8 }}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} sm={6} md={6}>
                      <Select
                        placeholder="Filter Gender"
                        style={{ width: '100%' }}
                        value={patientGender}
                        onChange={setPatientGender}
                        size="large"
                        allowClear
                      >
                        <Option value="Male">Male</Option>
                        <Option value="Female">Female</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Col>
                    <Col xs={24} sm={6} md={6} style={{ textAlign: 'right' }}>
                      <Button
                        type="dashed"
                        icon={<ReloadOutlined />}
                        onClick={handleResetPatients}
                        size="large"
                        style={{ borderRadius: 8, width: '100%' }}
                      >
                        Reset Filters
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* Patients Table */}
                <Card bodyStyle={{ padding: 0 }}>
                  <Table
                    dataSource={patients}
                    columns={patientColumns}
                    rowKey="patient_id"
                    loading={loading}
                    onChange={handlePatientTableChange}
                    pagination={{
                      defaultPageSize: 8,
                      showSizeChanger: true,
                      pageSizeOptions: ['5', '8', '15', '30'],
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} patient profiles`
                    }}
                    locale={{ emptyText: <Empty description="No patient profiles match your query." /> }}
                  />
                </Card>
              </div>
            )
          },
          {
            key: 'predictions',
            label: (
              <span>
                <DatabaseOutlined />
                Prediction Diagnostic Logs ({predictions.length})
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Predictions Filter Panel */}
                <Card className="filter-bar" bodyStyle={{ padding: '16px 20px' }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={10}>
                      <Input
                        placeholder="Search diagnostics by patient name..."
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        value={predSearch}
                        onChange={(e) => setPredSearch(e.target.value)}
                        size="large"
                        style={{ borderRadius: 8 }}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} sm={6} md={5}>
                      <Select
                        placeholder="Findings Outcome"
                        style={{ width: '100%' }}
                        value={predOutcome}
                        onChange={setPredOutcome}
                        size="large"
                        allowClear
                      >
                        <Option value="Gallstone">Gallstone</Option>
                        <Option value="Normal">Normal</Option>
                      </Select>
                    </Col>
                    <Col xs={24} sm={6} md={5}>
                      <Select
                        placeholder="Patient Gender"
                        style={{ width: '100%' }}
                        value={predGender}
                        onChange={setPredGender}
                        size="large"
                        allowClear
                      >
                        <Option value="Male">Male</Option>
                        <Option value="Female">Female</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Col>
                    <Col xs={24} sm={24} md={4} style={{ textAlign: 'right' }}>
                      <Button
                        type="dashed"
                        icon={<ReloadOutlined />}
                        onClick={handleResetPredictions}
                        size="large"
                        style={{ borderRadius: 8, width: '100%' }}
                      >
                        Reset
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* Predictions Table */}
                <Card bodyStyle={{ padding: 0 }}>
                  <Table
                    dataSource={predictions}
                    columns={predictionColumns}
                    rowKey="prediction_id"
                    loading={loading}
                    onChange={handlePredTableChange}
                    pagination={{
                      defaultPageSize: 8,
                      showSizeChanger: true,
                      pageSizeOptions: ['5', '8', '15', '30'],
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} predictions`
                    }}
                    rowClassName={(record) => record.prediction === 'Gallstone' ? 'gallstone-row' : ''}
                    locale={{ emptyText: <Empty description="No diagnostics match your query." /> }}
                  />
                </Card>
              </div>
            )
          }
        ]}
      />
    </div>
  );
};

export default AdminDashboard;
