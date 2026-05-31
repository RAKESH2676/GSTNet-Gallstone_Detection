import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, Upload, Button, Card, Row, Col,
  Progress, Alert, Spin, Typography, Space, message, DatePicker, Divider, Tooltip
} from 'antd';
import {
  InboxOutlined, PlayCircleOutlined, DownloadOutlined,
  ReloadOutlined, ExperimentOutlined, FilePdfOutlined,
  IdcardOutlined, CopyOutlined, CheckCircleOutlined,
  ArrowLeftOutlined, LockOutlined, CalendarOutlined,
  UserOutlined, HeartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const UploadScan = () => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [formValidated, setFormValidated] = useState(false);

  const navigate = useNavigate();

  const steps = [
    "Uploading ultrasound scan to secure medical vault...",
    "Extracting LBP and GLCM local texture metrics...",
    "Executing CNN deep feature extraction layers...",
    "Fusing texture + deep vectors via Dual Attention Module...",
    "Running final dense diagnostic classification...",
    "Computing Grad-CAM explainable AI heatmaps...",
    "Generating Report ID and compiling clinical PDF...",
  ];

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Only image files are supported.');
      return Upload.LIST_IGNORE;
    }
    setFileList([file]);
    return false;
  };

  const handleReset = () => {
    setResult(null);
    setFileList([]);
    setCopied(false);
    setFormValidated(false);
    form.resetFields();
  };

  const copyReportId = (id) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onFieldsChange = () => {
    // Check if the form is fully valid to enable image upload/diagnosis
    const values = form.getFieldsValue();
    const hasName = !!values.patient_name;
    const hasDOB = !!values.date_of_birth;
    const hasAge = !!values.age;
    const hasGender = !!values.gender;
    const hasPassword = !!values.password && values.password.length >= 6;
    const hasConfirm = !!values.confirm_password && values.password === values.confirm_password;

    setFormValidated(hasName && hasDOB && hasAge && hasGender && hasPassword && hasConfirm);
  };

  const onFinish = async (values) => {
    if (fileList.length === 0) {
      message.error("Please upload an ultrasound image scan first.");
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("patient_name", values.patient_name);
    formData.append("age", values.age);
    formData.append("gender", values.gender);
    formData.append("date_of_birth", values.date_of_birth.format("YYYY-MM-DD"));
    formData.append("password", values.password);
    formData.append("confirm_password", values.confirm_password);
    formData.append("image", fileList[0]);

    try {
      const response = await axios.post("http://localhost:5000/api/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (response.data.success) {
        message.success("Diagnostic scan completed successfully.");
        setResult(response.data);
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Inference failed. Verify Flask server status.");
    } finally {
      setLoading(false);
    }
  };

  const isGallstone = result?.prediction?.prediction === 'Gallstone';

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
            <ExperimentOutlined style={{ fontSize: 18, color: '#fff' }} />
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

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {loading ? (
          <Card style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 20, background: '#fff', color: '#000' }}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <Spin size="large" />
              <div>
                <Title level={3} style={{ color: '#0f52ba', fontFamily: 'Outfit' }}>
                  Analyzing Ultrasound Imagery...
                </Title>
                <Text strong type="secondary" style={{ fontSize: 16 }}>
                  {steps[loadingStep]}
                </Text>
              </div>
              <Progress
                percent={Math.round(((loadingStep + 1) / steps.length) * 100)}
                status="active" strokeColor="#0f52ba"
                style={{ maxWidth: 500, margin: '0 auto' }}
              />
            </Space>
          </Card>

        ) : result ? (
          /* ─── RESULT VIEW ─────────────────────────────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
            {/* Success alert */}
            <Alert
              message="✅ Diagnosis Completed — Report Saved Securely"
              type="success" showIcon style={{ borderRadius: 12 }}
            />

            {/* Report ID Banner */}
            {result.prediction.report_id && (
              <div style={{
                background: 'linear-gradient(135deg, #0f52ba 0%, #1a73e8 100%)',
                borderRadius: 16, padding: '20px 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 8px 32px rgba(15,82,186,0.25)'
              }}>
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, letterSpacing: 1, display: 'block' }}>
                    UNIQUE REPORT ID
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', letterSpacing: 1 }}>
                    {result.prediction.report_id}
                  </Text>
                </div>
                <Space size={16}>
                  <Tooltip title={copied ? "Copied!" : "Copy Report ID"}>
                    <Button
                      icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                      onClick={() => copyReportId(result.prediction.report_id)}
                      style={{
                        background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)',
                        color: '#fff', fontWeight: 700, borderRadius: 10, height: 44
                      }}
                    >
                      {copied ? 'Copied' : 'Copy Report ID'}
                    </Button>
                  </Tooltip>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    ⚠️ Save this ID. Required to access your report.
                  </Text>
                </Space>
              </div>
            )}

            {/* Diagnosis Result Card */}
            <Card style={{ borderRadius: 20, background: '#fff', color: '#000' }}>
              <Row gutter={[32, 32]} align="middle">
                {/* Info and Prediction */}
                <Col xs={24} lg={10}>
                  <Space direction="vertical" size={20} style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                        GSTNet Classification Verdict
                      </Text>
                      <Title level={1} style={{
                        color: isGallstone ? '#dc2626' : '#16a34a',
                        margin: '4px 0 0 0', fontFamily: 'Outfit', fontWeight: 800
                      }}>
                        {result.prediction.prediction.toUpperCase()}
                      </Title>
                    </div>

                    <div style={{
                      padding: '16px',
                      background: isGallstone ? '#fef2f2' : '#f0fdf4',
                      borderRadius: 12,
                      border: `1px solid ${isGallstone ? '#fecaca' : '#bbf7d0'}`,
                      color: isGallstone ? '#991b1b' : '#166534',
                      fontSize: 14, lineHeight: 1.5
                    }}>
                      {isGallstone
                        ? "Gallstone detected. Multi-dimensional texture fusion layers identified characteristic acoustic shadowing and echogenic deposits."
                        : "Normal gallbladder study. Wall thickness lies within physiological parameters; no echogenic foci or gallstones identified."}
                    </div>

                    {/* Patient Card */}
                    <Card bodyStyle={{ padding: 20 }}
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14 }}>
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>PATIENT NAME</Text>
                          <Paragraph strong style={{ margin: 0, fontSize: 14 }}>{result.patient.patient_name}</Paragraph>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>GENDER</Text>
                          <Paragraph strong style={{ margin: 0, fontSize: 14 }}>{result.patient.gender}</Paragraph>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>DATE OF BIRTH</Text>
                          <Paragraph strong style={{ margin: 0, fontSize: 14 }}>{result.patient.date_of_birth}</Paragraph>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>AGE</Text>
                          <Paragraph strong style={{ margin: 0, fontSize: 14 }}>{result.patient.age} Years</Paragraph>
                        </Col>
                        <Col span={24}>
                          <Divider style={{ margin: '8px 0' }} />
                          <Text type="secondary" style={{ fontSize: 11 }}>DIAGNOSIS DATE</Text>
                          <Paragraph strong style={{ margin: 0, fontSize: 13 }}>
                            {new Date(result.prediction.timestamp).toLocaleString()}
                          </Paragraph>
                        </Col>
                      </Row>
                    </Card>

                    {/* Confidence Score */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      background: '#f1f5f9', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0'
                    }}>
                      <Progress
                        type="circle"
                        percent={Math.round(result.prediction.confidence * 100)}
                        width={64}
                        strokeColor={isGallstone ? '#dc2626' : '#16a34a'}
                      />
                      <div>
                        <Title level={4} style={{ margin: 0, fontFamily: 'Outfit' }}>
                          {(result.prediction.confidence * 100).toFixed(1)}% Confidence
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Spatial + Texture Co-occurrence Weight
                        </Text>
                      </div>
                    </div>

                    <Space size={14}>
                      <Button
                        type="primary" icon={<FilePdfOutlined />} size="large"
                        href={`http://localhost:5000${result.prediction.report_path}`}
                        target="_blank"
                        style={{ background: '#0f52ba', borderColor: '#0f52ba', height: 48, borderRadius: 10 }}
                      >
                        Download PDF Report
                      </Button>
                      <Button icon={<ReloadOutlined />} size="large" onClick={handleReset} style={{ height: 48, borderRadius: 10 }}>
                        New Diagnosis
                      </Button>
                    </Space>
                  </Space>
                </Col>

                {/* Imagery Panel */}
                <Col xs={24} lg={14}>
                  <div className="image-panel-container">
                    <div className="scan-box">
                      <img src={`http://localhost:5000${result.prediction.image_path}`} alt="Ultrasound scan" />
                      <Text strong type="secondary" style={{ display: 'block', marginTop: 8 }}>
                        Figure A: Original Ultrasound
                      </Text>
                    </div>
                    <div className="scan-box">
                      <img src={`http://localhost:5000${result.prediction.heatmap_path}`} alt="Grad-CAM" />
                      <Text strong style={{ color: '#0f52ba', display: 'block', marginTop: 8 }}>
                        Figure B: Grad-CAM Explainability
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </div>

        ) : (
          /* ─── NEW DIAGNOSIS UPLOAD & REGISTRATION FORM ──────────────────────── */
          <Row gutter={[32, 32]}>
            {/* Registration Form */}
            <Col xs={24} lg={11}>
              <Card
                title={
                  <Space>
                    <IdcardOutlined style={{ color: '#0f52ba' }} />
                    <span style={{ fontFamily: 'Outfit', fontWeight: 700 }}>Patient Registration</span>
                  </Space>
                }
                style={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onFinish}
                  requiredMark={false}
                  onFieldsChange={onFieldsChange}
                  size="large"
                >
                  <Form.Item
                    label={<span style={{ fontWeight: 600 }}>Patient Name</span>}
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

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label={<span style={{ fontWeight: 600 }}>Age (Years)</span>}
                        name="age"
                        rules={[{ required: true, message: 'Please enter age.' }]}
                      >
                        <Input type="number" min={1} max={120} placeholder="Age" style={{ borderRadius: 8 }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label={<span style={{ fontWeight: 600 }}>Gender</span>}
                        name="gender"
                        rules={[{ required: true, message: 'Please select gender.' }]}
                      >
                        <Select placeholder="Select Gender">
                          <Option value="Male">Male</Option>
                          <Option value="Female">Female</Option>
                          <Option value="Other">Other</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label={<span style={{ fontWeight: 600 }}>Create Password</span>}
                    name="password"
                    rules={[
                      { required: true, message: 'Please create a secure password.' },
                      { min: 6, message: 'Password must be at least 6 characters.' }
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Minimum 6 characters" style={{ borderRadius: 8 }} />
                  </Form.Item>

                  <Form.Item
                    label={<span style={{ fontWeight: 600 }}>Confirm Password</span>}
                    name="confirm_password"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your password.' },
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
                    <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Re-enter password" style={{ borderRadius: 8 }} />
                  </Form.Item>

                  <div style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 8, padding: '12px', marginBottom: 16, fontSize: '12.5px', color: '#1e40af'
                  }}>
                    🔐 <b>Secure Access Protocol:</b> The created password and DOB are required to access this patient's diagnostic reports in the future.
                  </div>
                </Form>
              </Card>
            </Col>

            {/* Ultrasound Upload Card */}
            <Col xs={24} lg={13}>
              <Card
                title={
                  <Space>
                    <ExperimentOutlined style={{ color: '#0f52ba' }} />
                    <span style={{ fontFamily: 'Outfit', fontWeight: 700 }}>Ultrasound Imaging & Diagnosis</span>
                  </Space>
                }
                style={{ borderRadius: 16, border: 'none', height: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
              >
                {!formValidated ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: 250, padding: 20, textAlign: 'center', background: '#f8fafc', borderRadius: 12,
                    border: '1.5px dashed #cbd5e1', color: '#64748b'
                  }}>
                    <LockOutlined style={{ fontSize: 36, color: '#94a3b8', marginBottom: 12 }} />
                    <Text strong style={{ color: '#64748b' }}>Registration Fields Locked</Text>
                    <Text type="secondary" style={{ fontSize: 13, maxWidth: 320, marginTop: 4 }}>
                      Please complete all patient registration fields (including password validation) on the left to unlock the ultrasound scan upload.
                    </Text>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <Dragger
                      accept=".png,.jpg,.jpeg,.bmp,.tif,.tiff"
                      beforeUpload={beforeUpload}
                      fileList={fileList}
                      maxCount={1}
                      onRemove={() => setFileList([])}
                      style={{
                        padding: '30px 20px', borderRadius: 12,
                        background: '#f0f7ff', border: '2px dashed #0f52ba',
                      }}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined style={{ color: '#0f52ba' }} />
                      </p>
                      <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 'bold' }}>
                        Drag & Drop Ultrasound Scan Here
                      </p>
                      <p className="ant-upload-hint" style={{ fontSize: 13 }}>
                        Supports standard medical formats (PNG, JPG, BMP, TIFF)
                      </p>
                    </Dragger>

                    {fileList.length > 0 && (
                      <div style={{
                        marginTop: 16, padding: '12px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <Space>
                          <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 18 }} />
                          <div>
                            <Text strong style={{ fontSize: 13.5, color: '#166534', display: 'block' }}>
                              {fileList[0].name}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Ready for neural network classification · ({(fileList[0].size / 1024).toFixed(1)} KB)
                            </Text>
                          </div>
                        </Space>
                        <Button type="link" danger onClick={() => setFileList([])} style={{ fontWeight: 600 }}>
                          Remove
                        </Button>
                      </div>
                    )}

                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      size="large"
                      block
                      disabled={fileList.length === 0}
                      onClick={() => form.submit()}
                      style={{
                        height: 52,
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: 700,
                        marginTop: 24,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      Start GSTNet Diagnostic Analysis
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </main>
    </div>
  );
};

export default UploadScan;
