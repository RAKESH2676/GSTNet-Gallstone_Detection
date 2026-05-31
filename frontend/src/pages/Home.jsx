import React from 'react';
import { Card, Button, Typography, Row, Col, Space } from 'antd';
import {
  ExperimentOutlined,
  SafetyCertificateOutlined,
  PlayCircleOutlined,
  ArrowRightOutlined,
  LockOutlined,
  FileProtectOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #0f2847 40%, #0f52ba 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Circles */}
      <div style={{
        position: 'absolute',
        width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(26, 115, 232, 0.12) 0%, transparent 70%)',
        top: '-150px',
        right: '-150px',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
        bottom: '-100px',
        left: '-100px',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <header style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, #0f52ba 0%, #1a73e8 100%)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(15, 82, 186, 0.3)'
          }}>
            <ExperimentOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#fff', fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
            GSTNet™
          </Title>
        </div>
        <Button
          type="ghost"
          icon={<LockOutlined />}
          onClick={() => navigate('/login')}
          style={{
            borderColor: 'rgba(255, 255, 255, 0.25)',
            color: 'rgba(255, 255, 255, 0.85)',
            borderRadius: 8,
            fontWeight: 600,
            height: 40
          }}
        >
          Doctor / Admin Portal
        </Button>
      </header>

      {/* Hero Section */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
        maxWidth: 1200,
        margin: '0 auto',
        zIndex: 10,
        textAlign: 'center'
      }}>
        <div className="animate-fade-in" style={{ marginBottom: 48 }}>
          <Title style={{
            color: '#fff',
            fontSize: '44px',
            fontFamily: 'Outfit',
            fontWeight: 800,
            marginBottom: 16,
            lineHeight: 1.2
          }}>
            Gallstone Texture Network Diagnosis
          </Title>
          <Paragraph style={{
            color: 'rgba(255, 255, 255, 0.75)',
            fontSize: '17px',
            maxWidth: 700,
            margin: '0 auto 8px auto',
            lineHeight: 1.6
          }}>
            Deep learning-based ultrasound scanning platform fusing high-resolution spatial features
            with texture co-occurrence analytics for clinical-grade gallstone detection.
          </Paragraph>
          <Text style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: '12px',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.2)'
          }}>
            🔒 HIPAA Compliant & Patient Data Encryption Active
          </Text>
        </div>

        {/* Primary Option Cards */}
        <Row gutter={[32, 32]} style={{ width: '100%', maxWidth: 900 }}>
          {/* Card 1: New Diagnosis */}
          <Col xs={24} md={12}>
            <Card
              className="animate-slide-up"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 20,
                textAlign: 'left',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s'
              }}
              bodyStyle={{
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{
                  width: 52, height: 52,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)'
                }}>
                  <PlayCircleOutlined style={{ fontSize: 24, color: '#fff' }} />
                </div>
                <Title level={3} style={{ color: '#fff', margin: '0 0 12px 0', fontFamily: 'Outfit' }}>
                  New Diagnosis
                </Title>
                <Paragraph style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: 1.5 }}>
                  Perform an instant, secure AI-assisted ultrasound scan analysis. Fully register patient
                  details, upload scanning media, and receive automated diagnostic predictions.
                </Paragraph>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate('/new-diagnosis')}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: '15px',
                  marginTop: 20,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                }}
              >
                Start Diagnosis
              </Button>
            </Card>
          </Col>

          {/* Card 2: Patient Report Access */}
          <Col xs={24} md={12}>
            <Card
              className="animate-slide-up"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 20,
                textAlign: 'left',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s'
              }}
              bodyStyle={{
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{
                  width: 52, height: 52,
                  background: 'linear-gradient(135deg, #0f52ba 0%, #1a73e8 100%)',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                  boxShadow: '0 8px 20px rgba(15, 82, 186, 0.25)'
                }}>
                  <SafetyCertificateOutlined style={{ fontSize: 24, color: '#fff' }} />
                </div>
                <Title level={3} style={{ color: '#fff', margin: '0 0 12px 0', fontFamily: 'Outfit' }}>
                  Patient Report Access
                </Title>
                <Paragraph style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: 1.5 }}>
                  Retrieve your personal diagnostic report instantly and securely. Requires your unique
                  Report ID, Date of Birth, and password to verify identity and maintain privacy.
                </Paragraph>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<FileProtectOutlined />}
                onClick={() => navigate('/patient-report')}
                style={{
                  background: 'linear-gradient(135deg, #0f52ba 0%, #1a73e8 100%)',
                  border: 'none',
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: '15px',
                  marginTop: 20,
                  boxShadow: '0 4px 14px rgba(15, 82, 186, 0.3)'
                }}
              >
                Access Diagnostic Report
              </Button>
            </Card>
          </Col>
        </Row>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '24px 40px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.5)',
        zIndex: 10
      }}>
        © 2026 GSTNet™ Diagnostic Laboratories. All Rights Reserved. Authorized Clinical Personnel Only.
      </footer>
    </div>
  );
};

export default Home;
