import React, { useState, useEffect, useRef } from 'react';
import {
  Form, Input, Button, Card, Typography, Alert, Select, Tabs, message, DatePicker
} from 'antd';
import dayjs from 'dayjs';
import {
  UserOutlined, LockOutlined, MailOutlined, ExperimentOutlined,
  TeamOutlined, SafetyCertificateOutlined, ManOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Register = () => {
  const [patientForm] = Form.useForm();
  const [adminForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('patient');
  const particleRef = useRef(null);
  const navigate = useNavigate();

  // Floating particles animation
  useEffect(() => {
    const container = particleRef.current;
    if (!container) return;
    const particles = [];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 6 + 2;
      p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;bottom:-10px;animation-duration:${Math.random()*12+8}s;animation-delay:${Math.random()*5}s;`;
      container.appendChild(p);
      particles.push(p);
    }
    return () => particles.forEach(p => p.remove());
  }, []);

  const handlePatientRegister = async (values) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post('http://localhost:5000/api/register', {
        username: values.username,
        email: values.email,
        password: values.password,
        confirm_password: values.confirm_password,
        role: 'patient',
        patient_name: values.patient_name,
        age: values.age,
        gender: values.gender,
        date_of_birth: values.date_of_birth ? values.date_of_birth.format('YYYY-MM-DD') : '',
      });
      if (res.data.success) {
        message.success('Patient account created! Please sign in.');
        navigate('/login');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminRegister = async (values) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post('http://localhost:5000/api/register', {
        username: values.username,
        email: values.email,
        password: values.password,
        confirm_password: values.confirm_password,
        role: 'admin',
        admin_code: values.admin_code,
      });
      if (res.data.success) {
        message.success('Admin account created! Please sign in.');
        navigate('/login');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Admin registration failed. Verify your admin code.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { borderRadius: 10, height: 46, background: '#f8fafc', border: '1.5px solid #e2e8f0' };

  return (
    <div className="login-bg" ref={particleRef}>
      <Card
        className="login-card animate-slide-up"
        style={{ width: 500, borderRadius: 20, padding: '4px 0' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, #0f52ba 0%, #1a73e8 100%)',
            borderRadius: 14, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 12, boxShadow: '0 8px 24px rgba(15,82,186,0.3)'
          }}>
            <ExperimentOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#0f52ba', fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
            Create Account
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            GSTNet™ Clinical Diagnostic Portal
          </Text>
        </div>

        {errorMsg && (
          <Alert message={errorMsg} type="error" showIcon
            style={{ marginBottom: 16, borderRadius: 10 }} closable onClose={() => setErrorMsg('')} />
        )}

        <Tabs
          activeKey={activeTab}
          onChange={(k) => { setActiveTab(k); setErrorMsg(''); }}
          centered
          style={{ marginBottom: 4 }}
          items={[
            {
              key: 'patient',
              label: (
                <span><TeamOutlined style={{ marginRight: 6 }} />Patient</span>
              ),
              children: (
                <Form form={patientForm} layout="vertical" onFinish={handlePatientRegister}
                  size="large" requiredMark={false}>

                  {/* Patient Name */}
                  <Form.Item name="patient_name" label="Full Name"
                    rules={[{ required: true, message: 'Enter your full name.' }]}>
                    <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Full name (e.g. John Doe)" style={inputStyle} />
                  </Form.Item>

                  {/* Date of Birth */}
                  <Form.Item name="date_of_birth" label="Date of Birth"
                    rules={[{ required: true, message: 'Date of birth is required for report access.' }]}>
                    <DatePicker
                      style={{ width: '100%', borderRadius: 10, height: 46, background: '#f8fafc' }}
                      placeholder="Select date of birth"
                      disabledDate={(d) => d && d > dayjs()}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>

                  {/* Age + Gender row */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Form.Item name="age" label="Age" style={{ flex: 1 }}
                      rules={[{ required: true, message: 'Enter age.' }]}>
                      <Input type="number" min={1} max={120} placeholder="Age" style={inputStyle} />
                    </Form.Item>
                    <Form.Item name="gender" label="Gender" style={{ flex: 1 }}
                      rules={[{ required: true, message: 'Select gender.' }]}>
                      <Select placeholder="Gender" style={{ height: 46 }}>
                        <Option value="Male">Male</Option>
                        <Option value="Female">Female</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Form.Item>
                  </div>

                  {/* Username */}
                  <Form.Item name="username" label="Username"
                    rules={[{ required: true, message: 'Choose a username.' }, { min: 3, message: 'At least 3 characters.' }]}>
                    <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Username (min 3 chars)" style={inputStyle} />
                  </Form.Item>

                  {/* Email */}
                  <Form.Item name="email" label="Email Address"
                    rules={[{ required: true, message: 'Enter your email.' }, { type: 'email', message: 'Invalid email.' }]}>
                    <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="your@email.com" style={inputStyle} />
                  </Form.Item>

                  {/* Password */}
                  <Form.Item name="password" label="Password"
                    rules={[{ required: true, message: 'Enter a password.' }, { min: 6, message: 'At least 6 characters.' }]}>
                    <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Password (min 6 chars)" style={inputStyle} />
                  </Form.Item>

                  {/* Confirm Password */}
                  <Form.Item name="confirm_password" label="Confirm Password"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Confirm your password.' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) return Promise.resolve();
                          return Promise.reject(new Error('Passwords do not match.'));
                        },
                      }),
                    ]}>
                    <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Re-enter password" style={inputStyle} />
                  </Form.Item>

                  <Form.Item style={{ marginTop: 8, marginBottom: 8 }}>
                    <Button type="primary" htmlType="submit" block loading={loading}
                      style={{ height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12 }}>
                      Create Patient Account
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'admin',
              label: (
                <span><SafetyCertificateOutlined style={{ marginRight: 6 }} />Admin</span>
              ),
              children: (
                <Form form={adminForm} layout="vertical" onFinish={handleAdminRegister}
                  size="large" requiredMark={false}>

                  {/* Username */}
                  <Form.Item name="username" label="Admin Username"
                    rules={[{ required: true, message: 'Choose a username.' }, { min: 3, message: 'At least 3 characters.' }]}>
                    <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Admin username" style={inputStyle} />
                  </Form.Item>

                  {/* Email */}
                  <Form.Item name="email" label="Admin Email"
                    rules={[{ required: true, message: 'Enter your email.' }, { type: 'email', message: 'Invalid email.' }]}>
                    <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="admin@hospital.com" style={inputStyle} />
                  </Form.Item>

                  {/* Password */}
                  <Form.Item name="password" label="Password"
                    rules={[{ required: true, message: 'Enter a password.' }, { min: 6, message: 'At least 6 characters.' }]}>
                    <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Password (min 6 chars)" style={inputStyle} />
                  </Form.Item>

                  {/* Confirm Password */}
                  <Form.Item name="confirm_password" label="Confirm Password"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Confirm your password.' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) return Promise.resolve();
                          return Promise.reject(new Error('Passwords do not match.'));
                        },
                      }),
                    ]}>
                    <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Re-enter password" style={inputStyle} />
                  </Form.Item>

                  {/* Admin Code */}
                  <Form.Item name="admin_code" label="Admin Registration Code"
                    rules={[{ required: true, message: 'Enter the admin secret code.' }]}>
                    <Input.Password prefix={<SafetyCertificateOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Admin secret code"
                      style={{ ...inputStyle, borderColor: '#f59e0b' }} />
                  </Form.Item>

                  <div style={{
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 8, padding: '8px 12px', marginBottom: 16
                  }}>
                    <Text style={{ fontSize: 12, color: '#92400e' }}>
                      🔐 Demo admin code: <b>GSTNET-ADMIN-2026</b>
                    </Text>
                  </div>

                  <Form.Item style={{ marginTop: 4, marginBottom: 8 }}>
                    <Button type="primary" htmlType="submit" block loading={loading}
                      style={{ height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12,
                               background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' }}>
                      Register Admin Account
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />

        {/* Back to Login */}
        <div style={{ textAlign: 'center', marginTop: 8, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <Button type="link" icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/login')}
            style={{ fontWeight: 600, color: '#0f52ba' }}>
            Back to Sign In
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Register;
