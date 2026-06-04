import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, ConfigProvider } from 'antd';
import { RobotOutlined, EditOutlined, HomeOutlined, ThunderboltOutlined } from '@ant-design/icons';
import App from './App.jsx';
import ManualForm from './ManualForm.jsx';
import AiForm from './AiForm.jsx'; // 💡 On importe la nouvelle page
import './index.css'; 

const { Header, Content, Footer } = Layout;

export function Navigation() {
  const location = useLocation();

  // 💡 On ajoute notre 3ème onglet au menu
  const menuItems = [
    { 
      key: '/', 
      icon: <HomeOutlined />, 
      label: <Link to="/">Bibliothèque</Link> 
    },
    { 
      key: '/manuel', 
      icon: <EditOutlined />, 
      label: <Link to="/manuel">Rédaction Manuelle</Link> 
    },
    { 
      key: '/ai', 
      icon: <ThunderboltOutlined />, 
      label: <Link to="/ai">Génération IA</Link> 
    },
  ];

  return (
      <Header style={{ background: '#fff', display: 'flex', alignItems: 'center', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', zIndex: 1 }}>
        
        {/* 💡 On ajoute nowrap et flexShrink: 0 pour bloquer le layout au chargement */}
        <div style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          marginRight: '40px', 
          color: '#1677ff', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          whiteSpace: 'nowrap', 
          flexShrink: 0 
        }}>
          <RobotOutlined style={{ fontSize: '24px' }} /> AI Generator
        </div>

        <Menu mode="horizontal" selectedKeys={[location.pathname]} items={menuItems} style={{ flex: 1, borderBottom: 'none' }} />
      </Header>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { borderRadius: 8, colorPrimary: '#1677ff' } }}>
      <BrowserRouter>
        <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
          <Navigation />
          
          <Content style={{ padding: '40px 24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <Routes>
              {/* 💡 On déclare les 3 routes */}
              <Route path="/" element={<App />} />
              <Route path="/manuel" element={<ManualForm />} />
              <Route path="/ai" element={<AiForm />} />
            </Routes>
          </Content>
          
          <Footer style={{ textAlign: 'center', color: '#888' }}>
            AI Content Generator ©{new Date().getFullYear()} - Propulsé par Symfony & React
          </Footer>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js')
      .then((reg) => console.log('PWA : Service Worker actif ! Scope:', reg.scope))
      .catch((err) => console.error('PWA : Échec du Service Worker :', err));
  });
}