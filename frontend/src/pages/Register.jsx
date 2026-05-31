import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Card, Typography, Alert, message } from 'antd';
import {
  UserOutlined, LockOutlined, MailOutlined, ExperimentOutlined,
  SafetyCertificateOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

const { Title, Text } = Typography;

const Register = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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

  const handleAdminRegister = async (values) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post(getApiUrl('/api/register'), {
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password.trim(),
        confirm_password: values.confirm_password.trim(),
        role: 'admin',
        admin_code: values.admin_code.trim(),
      });
      if (res.data.success) {
        message.success('Clinician account created! Please sign in.');
        navigate('/login');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Clinician registration failed. Verify your admin code.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { borderRadius: 10, height: 46, background: '#f8fafc', border: '1.5px solid #e2e8f0' };

  return (
    <div className="login-bg" ref={particleRef}>
      <Card
        className="login-card animate-slide-up"
        style={{ width: 480, borderRadius: 20, padding: '12px 0' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
            borderRadius: 14, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 12, boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
          }}>
            <SafetyCertificateOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#7c3aed', fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
            Register Clinician Account
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            GSTNet™ Authorized Portal Access Setup
          </Text>
        </div>

        {errorMsg && (
          <Alert message={errorMsg} type="error" showIcon
            style={{ marginBottom: 16, borderRadius: 10 }} closable onClose={() => setErrorMsg('')} />
        )}

        <Form form={form} layout="vertical" onFinish={handleAdminRegister}
          size="large" requiredMark={false}>

          {/* Username */}
          <Form.Item name="username" label={<span style={{ fontWeight: 600 }}>Username</span>}
            rules={[{ required: true, message: 'Choose a username.' }, { min: 3, message: 'At least 3 characters.' }]}>
            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Enter clinician username" style={inputStyle} />
          </Form.Item>

          {/* Email */}
          <Form.Item name="email" label={<span style={{ fontWeight: 600 }}>Clinical Email</span>}
            rules={[{ required: true, message: 'Enter your clinical email.' }, { type: 'email', message: 'Invalid email.' }]}>
            <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="doctor@hospital.com" style={inputStyle} />
          </Form.Item>

          {/* Password */}
          <Form.Item name="password" label={<span style={{ fontWeight: 600 }}>Password</span>}
            rules={[{ required: true, message: 'Enter a password.' }, { min: 6, message: 'At least 6 characters.' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Minimum 6 characters" style={inputStyle} />
          </Form.Item>

          {/* Confirm Password */}
          <Form.Item name="confirm_password" label={<span style={{ fontWeight: 600 }}>Confirm Password</span>}
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
          <Form.Item name="admin_code" label={<span style={{ fontWeight: 600 }}>Authorized Registration Code</span>}
            rules={[{ required: true, message: 'Enter the clinical verification code.' }]}>
            <Input.Password prefix={<SafetyCertificateOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Enter authorization code"
              style={{ ...inputStyle, borderColor: '#f59e0b' }} />
          </Form.Item>

          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20
          }}>
            <Text style={{ fontSize: 12, color: '#92400e' }}>
              🔐 <b>Clinical Setup Code:</b> Use <b>GSTNET-ADMIN-2026</b> to complete register.
            </Text>
          </div>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" block loading={loading}
              style={{ height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12,
                       background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', border: 'none' }}>
              Register Clinician Account
            </Button>
          </Form.Item>
        </Form>

        {/* Back to Login */}
        <div style={{ textAlign: 'center', marginTop: 8, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <Button type="link" icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/login')}
            style={{ fontWeight: 600, color: '#7c3aed' }}>
            Back to Sign In
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Register;
