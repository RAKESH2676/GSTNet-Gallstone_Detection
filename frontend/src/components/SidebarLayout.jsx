import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Typography, Avatar, theme, Breadcrumb } from 'antd';
import {
  DashboardOutlined,
  UploadOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  HeartOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content, Footer } = Layout;
const { Text, Title } = Typography;

const SidebarLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Enforce session check
  useEffect(() => {
    const token = localStorage.getItem("gstnet_token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  // Live time feed
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("gstnet_token");
    localStorage.removeItem("gstnet_user");
    navigate("/login");
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/dashboard')
    },
    {
      key: '/upload',
      icon: <UploadOutlined />,
      label: 'Run Diagnosis',
      onClick: () => navigate('/upload')
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: 'Patient Logs',
      onClick: () => navigate('/history')
    },
    {
      key: '/patient-report',
      icon: <SafetyCertificateOutlined />,
      label: 'Patient Report Access',
      onClick: () => navigate('/patient-report')
    },
    {
      key: '/about',
      icon: <InfoCircleOutlined />,
      label: 'About GSTNet',
      onClick: () => navigate('/about')
    },
    {
      type: 'divider',
      style: { margin: '12px 16px', borderColor: 'rgba(255,255,255,0.06)' }
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      danger: true,
      onClick: handleLogout
    }
  ];

  const getBreadcrumbName = (pathname) => {
    switch (pathname) {
      case '/dashboard':      return 'Dashboard';
      case '/upload':         return 'Run Diagnosis';
      case '/history':        return 'Patient Logs';
      case '/patient-report': return 'Patient Report Access';
      case '/about':          return 'About GSTNet';
      default:                return 'Portal';
    }
  };

  const user = JSON.parse(localStorage.getItem("gstnet_user") || '{"username":"Radiologist","role":"Admin"}');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="dark"
        width={240}
        style={{
          background: 'linear-gradient(180deg, #0a1628 0%, #0f2847 100%)',
          boxShadow: '2px 0 12px 0 rgba(10,22,40,.15)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Logo Section */}
        <div className="sidebar-logo">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            transition: 'all 0.3s'
          }}>
            <div style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #1a73e8 0%, #4a90d9 100%)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)',
              flexShrink: 0
            }}>
              <HeartOutlined style={{ fontSize: 16, color: '#fff' }} />
            </div>
            {!collapsed && (
              <Title level={4} style={{ 
                color: '#fff', 
                margin: 0, 
                fontFamily: 'Outfit',
                fontWeight: 700,
                letterSpacing: '-0.3px',
                whiteSpace: 'nowrap'
              }}>
                GSTNet™
              </Title>
            )}
          </div>
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ 
            borderRight: 0, 
            background: 'transparent',
            flex: 1,
            marginTop: 8
          }}
        />

        {/* Version footer in sidebar */}
        {!collapsed && (
          <div style={{ 
            padding: '12px 16px', 
            borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center'
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.5px' }}>
              GSTNET v2.0 · CPU INFERENCE
            </Text>
          </div>
        )}
      </Sider>
      
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.06)',
          zIndex: 9,
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Space size={16}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 40, height: 40, borderRadius: 8 }}
            />
            <div>
              <Title level={4} style={{ margin: 0, color: '#0f52ba', fontFamily: 'Outfit', letterSpacing: '-0.3px' }}>
                Gallstone Detection System
              </Title>
            </div>
          </Space>
          
          <Space size={20}>
            {/* Live Clock */}
            <div style={{ 
              background: '#f8fafc', 
              padding: '6px 14px', 
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}>
              <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12.5, letterSpacing: '0.3px' }}>
                {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {currentTime.toLocaleTimeString()}
              </Text>
            </div>
            
            {/* User Profile */}
            <Space style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '16px' }}>
              <Avatar 
                icon={<UserOutlined />} 
                style={{ 
                  background: 'linear-gradient(135deg, #0f52ba 0%, #1a73e8 100%)',
                  boxShadow: '0 2px 8px rgba(15, 82, 186, 0.25)'
                }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <Text strong style={{ fontSize: '12.5px' }}>{user.username}</Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>{user.role}</Text>
              </div>
            </Space>
          </Space>
        </Header>
        
        <Content style={{ margin: '16px 24px', display: 'flex', flexDirection: 'column' }}>
          <Breadcrumb style={{ marginBottom: '16px' }} items={[
            { title: 'Home' },
            { title: getBreadcrumbName(location.pathname) }
          ]} />
          
          <div style={{ 
            padding: 24, 
            minHeight: 360, 
            background: colorBgContainer, 
            borderRadius: borderRadiusLG,
            flex: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,.02)',
            overflowY: 'auto'
          }} className="animate-fade-in">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default SidebarLayout;
