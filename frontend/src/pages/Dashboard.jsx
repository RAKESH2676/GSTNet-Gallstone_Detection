import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Button, Spin, Empty, Typography, Space } from 'antd';
import {
  FileProtectOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  DownloadOutlined,
  EyeOutlined,
  RiseOutlined
} from '@ant-design/icons';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(getApiUrl("/api/dashboard"));
        if (response.data.success) {
          setData(response.data);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Loading clinical diagnostic metrics..." />
      </div>
    );
  }

  if (!data) {
    return <Empty description="Failed to retrieve analytics. Ensure Flask is active." />;
  }

  const { stats, recent_predictions, caseload_trend } = data;
  
  const positiveRate = stats.total_scans > 0 
    ? ((stats.gallstone_cases / stats.total_scans) * 100).toFixed(1) 
    : 0;

  const pieData = [
    { name: 'Normal', value: stats.normal_cases },
    { name: 'Gallstone', value: stats.gallstone_cases }
  ];
  
  const COLORS = ['#10b981', '#ef4444'];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: 'rgba(255,255,255,0.95)', 
          backdropFilter: 'blur(8px)',
          padding: '12px 16px', 
          borderRadius: 10, 
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          border: '1px solid #e2e8f0'
        }}>
          <Text strong style={{ fontSize: 13 }}>{label}</Text>
          {payload.map((entry, idx) => (
            <div key={idx} style={{ marginTop: 4 }}>
              <Text style={{ color: entry.color, fontSize: 12 }}>
                {entry.name}: <b>{entry.value}</b> cases
              </Text>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const columns = [
    {
      title: 'Case ID',
      dataIndex: 'prediction_id',
      key: 'prediction_id',
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
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'Age / Gender',
      key: 'age_gender',
      render: (_, record) => <Text>{record.patient.age} yrs / {record.patient.gender}</Text>
    },
    {
      title: 'Diagnosis Findings',
      dataIndex: 'prediction',
      key: 'prediction',
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
      title: 'GSTNet Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (conf) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 60, 
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
      title: 'Date Logged',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (time) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(time).toLocaleDateString()}</Text>
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => navigate('/upload', { state: { predictionResult: record } })}
            style={{ borderRadius: 6 }}
          >
            Review
          </Button>
          {record.report_path && (
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
          )}
        </Space>
      )
    }
  ];

  // Stat card config
  const statCards = [
    {
      title: 'Total Ultrasound Scans',
      value: stats.total_scans,
      color: '#0f52ba',
      icon: <FileProtectOutlined style={{ fontSize: 22, color: '#0f52ba' }} />,
      className: 'blue'
    },
    {
      title: 'Gallstone Cases',
      value: stats.gallstone_cases,
      color: '#ef4444',
      icon: <WarningOutlined style={{ fontSize: 22, color: '#ef4444' }} />,
      className: 'red'
    },
    {
      title: 'Normal Findings',
      value: stats.normal_cases,
      color: '#10b981',
      icon: <CheckCircleOutlined style={{ fontSize: 22, color: '#10b981' }} />,
      className: 'green'
    },
    {
      title: 'Positivity Ratio',
      value: positiveRate,
      suffix: '%',
      color: '#8b5cf6',
      icon: <RiseOutlined style={{ fontSize: 22, color: '#8b5cf6' }} />,
      className: 'purple'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* 1. TOP STAT CARDS */}
      <Row gutter={[16, 16]}>
        {statCards.map((card, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <Card 
              className={`stat-card ${card.className} animate-fade-in`} 
              style={{ animationDelay: `${idx * 0.1}s` }}
              bodyStyle={{ padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    {card.title}
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
                    <span style={{ 
                      fontSize: 32, 
                      fontWeight: 800, 
                      color: card.color, 
                      fontFamily: 'Outfit',
                      lineHeight: 1 
                    }}>
                      {card.value}
                    </span>
                    {card.suffix && (
                      <span style={{ fontSize: 18, fontWeight: 600, color: card.color }}>{card.suffix}</span>
                    )}
                  </div>
                </div>
                <div style={{ 
                  width: 44, 
                  height: 44, 
                  background: `${card.color}10`, 
                  borderRadius: 12, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 2. CHARTS */}
      <Row gutter={[16, 16]}>
        {/* Caseload Area Chart */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <span style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: 15 }}>
                Monthly Clinical Caseload Progression
              </span>
            } 
            bodyStyle={{ padding: 24 }}
          >
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={caseload_trend}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorGallstone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf1" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: 16 }}
                    formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>}
                  />
                  <Area type="monotone" dataKey="Gallstone" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGallstone)" dot={{ r: 3, fill: '#ef4444' }} />
                  <Area type="monotone" dataKey="Normal" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNormal)" dot={{ r: 3, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        
        {/* Pie Chart */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <span style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: 15 }}>
                Case Distribution
              </span>
            }
            bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} Scans`, 'Count']} 
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. RECENT ACTIVITY */}
      <Card 
        title={
          <span style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: 15 }}>
            Recent Clinical Diagnostic Registrations
          </span>
        }
        extra={
          <Button type="link" onClick={() => navigate('/history')} style={{ fontWeight: 'bold' }}>
            View Full Patient Logs <ArrowRightOutlined />
          </Button>
        }
      >
        <Table
          dataSource={recent_predictions}
          columns={columns}
          rowKey="prediction_id"
          pagination={false}
          locale={{ emptyText: 'No diagnosis files registered. Start by scanning an ultrasound image.' }}
          rowClassName={(record) => record.prediction === 'Gallstone' ? 'gallstone-row' : ''}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
