import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Card, Typography, Alert, message } from 'antd';
import {
  UserOutlined, LockOutlined, ExperimentOutlined,
  SafetyCertificateOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const particleContainerRef = useRef(null);

  // Generate floating particles on mount
  useEffect(() => {
    const container = particleContainerRef.current;
    if (!container) return;
    const particles = [];
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = Math.random() * 6 + 2;
      particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        bottom: -10px;
        animation-duration: ${Math.random() * 12 + 8}s;
        animation-delay: ${Math.random() * 5}s;
      `;
      container.appendChild(particle);
      particles.push(particle);
    }
    return () => { particles.forEach(p => p.remove()); };
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await axios.post(getApiUrl('/api/login'), {
        username: values.username.trim(),
        password: values.password.trim(),
      });

      if (response.data.success) {
        message.success('Clinical session authorized.');
        localStorage.setItem('gstnet_token', response.data.token);
        localStorage.setItem('gstnet_user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        'Failed to establish server connection. Verify Flask is active.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    borderRadius: 10,
    height: 48,
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
  };

  return (
    <div className="login-bg" ref={particleContainerRef}>
      <Card
        className="login-card animate-slide-up"
        style={{ width: 450, borderRadius: 20, padding: '16px 0' }}
      >
        {/* Branding header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
            borderRadius: 14, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14, boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
          }}>
            <SafetyCertificateOutlined style={{ fontSize: 26, color: '#fff' }} />
          </div>
          <Title level={2} style={{ margin: 0, color: '#7c3aed', fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
            Doctor / Admin Portal
          </Title>
          <Text type="secondary" style={{ fontSize: 13.5, display: 'block', marginTop: 4 }}>
            Authorized GSTNet™ Clinical Session
          </Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMsg('')}
            style={{ marginBottom: 20, borderRadius: 10 }}
          />
        )}

        <Form
          name="admin_login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>Username</span>}
            name="username"
            rules={[{ required: true, message: 'Please enter your username.' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Enter admin username"
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 600 }}>Password</span>}
            name="password"
            rules={[{ required: true, message: 'Please enter your password.' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Enter password"
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 50, fontSize: 16, fontWeight: 700, borderRadius: 12,
                letterSpacing: '0.3px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
              }}
            >
              Sign In to Dashboard
            </Button>
          </Form.Item>
        </Form>

        {/* Demo credentials and Back */}
        <div style={{
          textAlign: 'center', marginTop: 20,
          padding: '12px',
          background: '#f8fafc',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          marginBottom: 16
        }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            🔑 Demo credentials: <b>admin / admin123</b>
          </Text>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            New clinician?{' '}
            <Button
              type="link"
              style={{ padding: 0, fontWeight: 700, color: '#7c3aed' }}
              onClick={() => navigate('/register')}
            >
              Register clinician account
            </Button>
          </Text>
        </div>

        <div style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ fontWeight: 600, color: '#7c3aed' }}
          >
            Back to Home Page
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
