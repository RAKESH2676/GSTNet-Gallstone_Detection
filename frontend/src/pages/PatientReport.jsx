import React, { useState } from 'react';
import {
  Form, Input, Button, Card, Typography, Alert, DatePicker,
  Row, Col, Divider, Progress, Space, Spin, Modal
} from 'antd';
import {
  SearchOutlined, FilePdfOutlined, SafetyCertificateOutlined, IdcardOutlined,
  UserOutlined, CalendarOutlined, HeartOutlined, ExperimentOutlined,
  LockOutlined, ArrowLeftOutlined, KeyOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const PatientReport = () => {
  const [form] = Form.useForm();
  const [forgotForm] = Form.useForm();
  const [resetForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Forgot Password States
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Verify identity, 2 = Set new password, 3 = Success
  const [verifiedPatientId, setVerifiedPatientId] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    setReport(null);
    setSubmitted(true);
    try {
      const res = await axios.post('http://localhost:5000/api/patient-report-access', {
        report_id: values.report_id.trim().toUpperCase(),
        date_of_birth: values.date_of_birth.format('YYYY-MM-DD'),
        password: values.password,
      });
      if (res.data.success) {
        setReport(res.data.report);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Invalid Report ID, Date of Birth, or Password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setReport(null);
    setError('');
    setSubmitted(false);
  };

  // Forgot Password Step 1: Verify Identity
  const handleForgotVerify = async (values) => {
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await axios.post('http://localhost:5000/api/forgot-password', {
        report_id: values.report_id.trim().toUpperCase(),
        patient_name: values.patient_name.trim(),
        date_of_birth: values.date_of_birth.format('YYYY-MM-DD'),
      });
      if (res.data.success) {
        setVerifiedPatientId(res.data.patient_id);
        setForgotStep(2);
      }
    } catch (err) {
      setForgotError(
        err.response?.data?.message ||
        'Invalid Report ID, Patient Name, or Date of Birth.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password Step 2: Reset Password
  const handleForgotReset = async (values) => {
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await axios.post('http://localhost:5000/api/reset-password', {
        patient_id: verifiedPatientId,
        password: values.password,
        confirm_password: values.confirm_password,
      });
      if (res.data.success) {
        setForgotStep(3);
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setForgotModalVisible(false);
    setForgotStep(1);
    setVerifiedPatientId(null);
    setForgotError('');
    forgotForm.resetFields();
    resetForm.resetFields();
  };

  const isGallstone = report?.prediction === 'Gallstone';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #0f2847 40%, #0f52ba 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(10, 22, 40, 0.7)',
        backdropFilter: 'blur(10px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #0f52ba 0%, #1a73e8 100%)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(15, 82, 186, 0.3)'
          }}>
            <SafetyCertificateOutlined style={{ fontSize: 18, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#fff', fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
            GSTNet™ Diagnostic
          </Title>
        </div>
        <Button
          type="ghost"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          style={{
            borderColor: 'rgba(255, 255, 255, 0.25)',
            color: 'rgba(255, 255, 255, 0.85)',
            borderRadius: 8,
            fontWeight: 600
          }}
        >
          Back to Home Page
        </Button>
      </header>

      {/* Main Panel */}
      <main style={{ flex: 1, padding: '40px 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {report && !loading ? (
          /* ─── SECURE REPORT DISPLAY ───────────────────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-slide-up">
            <Alert
              message="✅ Identity Verified — Displaying Your Diagnosis Report"
              type="success" showIcon style={{ borderRadius: 12 }}
            />

            {/* Report Header Banner */}
            <div style={{
              background: 'linear-gradient(135deg,#0f52ba 0%,#1a73e8 100%)',
              borderRadius: 16, padding: '20px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(15,82,186,0.25)'
            }}>
              <div>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 1, display: 'block' }}>
                  REPORT ID
                </Text>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', letterSpacing: 1 }}>
                  {report.report_id}
                </Text>
              </div>
              {report.report_path && (
                <Button
                  icon={<FilePdfOutlined />} size="large"
                  href={`http://localhost:5000${report.report_path}`} target="_blank"
                  style={{
                    background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)',
                    color: '#fff', fontWeight: 700, borderRadius: 10
                  }}
                >
                  Download PDF Report
                </Button>
              )}
            </div>

            {/* Patient Info and Results Cards */}
            <Card style={{ borderRadius: 20, background: '#fff', color: '#000' }}>
              <Row gutter={[24, 24]}>
                {/* Patient details */}
                <Col xs={24} md={12}>
                  <Card
                    title={
                      <Space>
                        <UserOutlined style={{ color: '#0f52ba' }} />
                        <span>Patient Information</span>
                      </Space>
                    }
                    bodyStyle={{ padding: '20px' }}
                    style={{ borderRadius: 14, height: '100%', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: 'Patient Name', value: report.patient?.patient_name, icon: '👤' },
                        { label: 'Gender',       value: report.patient?.gender,       icon: '⚧' },
                        { label: 'Date of Birth', value: report.patient?.date_of_birth, icon: '🎂' },
                        { label: 'Age',          value: report.patient ? `${report.patient.age} Years` : '—', icon: '📅' },
                      ].map(({ label, value, icon }) => (
                        <div key={label} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', background: '#fff',
                          borderRadius: 10, border: '1px solid #e2e8f0'
                        }}>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {icon} &nbsp; {label}
                          </Text>
                          <Text strong style={{ fontSize: 14.5 }}>{value || '—'}</Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Col>

                {/* Diagnostic Result details */}
                <Col xs={24} md={12}>
                  <Card
                    title={
                      <Space>
                        <ExperimentOutlined style={{ color: '#0f52ba' }} />
                        <span>Diagnostic Result</span>
                      </Space>
                    }
                    bodyStyle={{ padding: '20px' }}
                    style={{ borderRadius: 14, height: '100%', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  >
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <div style={{
                        textAlign: 'center', padding: '18px',
                        background: isGallstone ? '#fef2f2' : '#f0fdf4',
                        borderRadius: 12, border: `2px solid ${isGallstone ? '#fecaca' : '#bbf7d0'}`
                      }}>
                        <Title level={2} style={{
                          color: isGallstone ? '#dc2626' : '#16a34a',
                          fontFamily: 'Outfit', margin: 0, fontWeight: 800
                        }}>
                          {report.prediction?.toUpperCase()}
                        </Title>
                        <Text style={{ color: isGallstone ? '#ef4444' : '#22c55e', fontSize: 13, fontWeight: 600 }}>
                          {isGallstone
                            ? 'Gallstone echogenic focus detected'
                            : 'Normal gallbladder study'}
                        </Text>
                      </div>

                      {/* Confidence Score */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Progress
                          type="circle"
                          percent={Math.round((report.confidence || 0) * 100)}
                          width={68}
                          strokeColor={isGallstone ? '#dc2626' : '#16a34a'}
                        />
                        <div>
                          <Text strong style={{ fontSize: 18 }}>
                            {((report.confidence || 0) * 100).toFixed(1)}%
                          </Text>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                            GSTNet Neural Decision Weight
                          </Text>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '10px 14px', background: '#fff',
                        borderRadius: 10, border: '1px solid #e2e8f0'
                      }}>
                        <Text type="secondary" style={{ fontSize: 12.5 }}>Diagnosis Date</Text>
                        <Text strong style={{ fontSize: 13 }}>
                          {report.timestamp ? new Date(report.timestamp).toLocaleString() : '—'}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>

              {/* Scan Media Panel */}
              {(report.image_path || report.heatmap_path) && (
                <div style={{ marginTop: 24 }}>
                  <Divider />
                  <Title level={4} style={{ color: '#0f52ba', fontFamily: 'Outfit', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HeartOutlined /> Ultrasound Scan Imaging
                  </Title>
                  <div className="image-panel-container">
                    {report.image_path && (
                      <div className="scan-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', flex: 1 }}>
                        <img src={`http://localhost:5000${report.image_path}`} alt="Original Ultrasound" />
                        <Text strong type="secondary" style={{ display: 'block', marginTop: 8 }}>Original Ultrasound Scan</Text>
                      </div>
                    )}
                    {report.heatmap_path && (
                      <div className="scan-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', flex: 1 }}>
                        <img src={`http://localhost:5000${report.heatmap_path}`} alt="Grad-CAM" />
                        <Text strong style={{ color: '#0f52ba', display: 'block', marginTop: 8 }}>Grad-CAM Visualization</Text>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Button onClick={handleReset} size="large" style={{ borderRadius: 10, height: 48, fontWeight: 600 }}>
                Search Another Report
              </Button>
            </div>
          </div>

        ) : (
          /* ─── SECURE LOOKUP FORM ──────────────────────────────────────────── */
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card
              title={
                <Space>
                  <LockOutlined style={{ color: '#0f52ba' }} />
                  <span style={{ fontFamily: 'Outfit', fontWeight: 700 }}>Secure Patient Report Access</span>
                </Space>
              }
              style={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', color: '#000' }}
              bodyStyle={{ padding: '32px' }}
            >
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: '13px', color: '#1e40af'
              }}>
                🔒 <b>Privacy-Protected Access Protocol:</b> Reports are private. To verify patient identity, please enter the unique <b>Report ID</b>, matching <b>Date of Birth</b>, and the secure <b>Password</b> created during registration.
              </div>

              {error && (
                <Alert
                  message="Access Denied"
                  description={error}
                  type="error" showIcon closable
                  onClose={() => setError('')}
                  style={{ marginBottom: 20, borderRadius: 10 }}
                />
              )}

              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16 }}><Text type="secondary">Authenticating & generating report...</Text></div>
                </div>
              ) : (
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onFinish}
                  requiredMark={false}
                  size="large"
                >
                  <Row gutter={[24, 0]}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label={<span style={{ fontWeight: 600 }}>Report ID</span>}
                        name="report_id"
                        rules={[
                          { required: true, message: 'Please enter Report ID.' },
                          {
                            pattern: /^GST-\d{8}-\d{4}$/i,
                            message: 'Format must be GST-YYYYMMDD-XXXX (e.g. GST-20260531-0001)'
                          }
                        ]}
                      >
                        <Input
                          prefix={<IdcardOutlined style={{ color: '#94a3b8' }} />}
                          placeholder="GST-20260531-0001"
                          style={{ borderRadius: 8, height: 48, fontFamily: 'monospace', letterSpacing: '0.5px' }}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            form.setFieldValue('report_id', val);
                          }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        label={<span style={{ fontWeight: 600 }}>Date of Birth</span>}
                        name="date_of_birth"
                        rules={[{ required: true, message: 'Please select Date of Birth.' }]}
                      >
                        <DatePicker
                          style={{ width: '100%', borderRadius: 8, height: 48 }}
                          placeholder="Select Date of Birth"
                          disabledDate={(d) => d && d > dayjs()}
                          format="YYYY-MM-DD"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label={<span style={{ fontWeight: 600 }}>Password</span>}
                    name="password"
                    rules={[{ required: true, message: 'Please enter your password.' }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Enter patient password"
                      style={{ borderRadius: 8, height: 48 }}
                    />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 12, marginTop: 12 }}>
                    <Button
                      type="primary" htmlType="submit" block icon={<SearchOutlined />}
                      style={{
                        height: 50, fontSize: 16, fontWeight: 700, borderRadius: 10,
                        background: 'linear-gradient(135deg, #0f52ba 0%, #1a73e8 100%)',
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(15, 82, 186, 0.3)'
                      }}
                    >
                      Authenticate & Access Report
                    </Button>
                  </Form.Item>

                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Button
                      type="link"
                      onClick={() => setForgotModalVisible(true)}
                      style={{ fontWeight: 600, color: '#0f52ba', padding: 0 }}
                    >
                      Forgot Password?
                    </Button>
                  </div>
                </Form>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* Forgot Password Reset Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: '#0f52ba' }} />
            <span style={{ fontFamily: 'Outfit', fontWeight: 700 }}>Password Recovery Portal</span>
          </Space>
        }
        visible={forgotModalVisible}
        onCancel={closeForgotModal}
        footer={null}
        destroyOnClose
        borderRadius={16}
        width={480}
        bodyStyle={{ padding: '24px 32px' }}
      >
        {forgotStep === 1 && (
          /* Step 1: Verify details */
          <div className="animate-fade-in">
            <Paragraph type="secondary" style={{ fontSize: '13px', marginBottom: 20 }}>
              Verify identity to reset password. Enter details exactly as registered.
            </Paragraph>

            {forgotError && (
              <Alert
                message={forgotError}
                type="error" showIcon closable
                onClose={() => setForgotError('')}
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
            )}

            <Form
              form={forgotForm}
              layout="vertical"
              onFinish={handleForgotVerify}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Report ID</span>}
                name="report_id"
                rules={[
                  { required: true, message: 'Please enter Report ID.' },
                  { pattern: /^GST-\d{8}-\d{4}$/i, message: 'Format: GST-YYYYMMDD-XXXX' }
                ]}
              >
                <Input
                  prefix={<IdcardOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="GST-20260531-0001"
                  style={{ borderRadius: 8 }}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    forgotForm.setFieldValue('report_id', val);
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Patient Full Name</span>}
                name="patient_name"
                rules={[{ required: true, message: 'Please enter patient full name.' }]}
              >
                <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="e.g. John Doe" style={{ borderRadius: 8 }} />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Date of Birth</span>}
                name="date_of_birth"
                rules={[{ required: true, message: 'Please select Date of Birth.' }]}
              >
                <DatePicker
                  style={{ width: '100%', borderRadius: 8 }}
                  placeholder="Select Date of Birth"
                  disabledDate={(d) => d && d > dayjs()}
                  format="YYYY-MM-DD"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
                <Button type="primary" htmlType="submit" block loading={forgotLoading} style={{ borderRadius: 8 }}>
                  Verify Credentials
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}

        {forgotStep === 2 && (
          /* Step 2: Set new password */
          <div className="animate-fade-in">
            <Paragraph type="secondary" style={{ fontSize: '13px', marginBottom: 20 }}>
              Identity verified. Please set a secure new password for your account.
            </Paragraph>

            {forgotError && (
              <Alert
                message={forgotError}
                type="error" showIcon closable
                onClose={() => setForgotError('')}
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
            )}

            <Form
              form={resetForm}
              layout="vertical"
              onFinish={handleForgotReset}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                label={<span style={{ fontWeight: 600 }}>New Password</span>}
                name="password"
                rules={[
                  { required: true, message: 'Please enter a secure password.' },
                  { min: 6, message: 'Password must be at least 6 characters.' }
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Minimum 6 characters" style={{ borderRadius: 8 }} />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600 }}>Confirm New Password</span>}
                name="confirm_password"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Please confirm new password.' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match.'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Re-enter new password" style={{ borderRadius: 8 }} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
                <Button type="primary" htmlType="submit" block loading={forgotLoading} style={{ borderRadius: 8 }}>
                  Reset Password
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}

        {forgotStep === 3 && (
          /* Step 3: Success */
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '10px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 52, color: '#16a34a', marginBottom: 16 }} />
            <Title level={3} style={{ fontFamily: 'Outfit', margin: '0 0 8px 0' }}>
              Password Reset Successful
            </Title>
            <Paragraph type="secondary" style={{ fontSize: '13.5px', marginBottom: 24 }}>
              Your password has been securely updated in the database. You can now use your new password to access your report.
            </Paragraph>
            <Button type="primary" block size="large" onClick={closeForgotModal} style={{ borderRadius: 8 }}>
              Back to Report Access
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PatientReport;
