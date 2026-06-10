import React, { useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Layout, Menu, ConfigProvider, Button } from 'antd';
import { RobotOutlined, EditOutlined, HomeOutlined, ThunderboltOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { AuthContext } from './AuthContext.js';
import { AuthProvider } from './AuthProvider.jsx';
import App from './App.jsx';
import ManualForm from './ManualForm.jsx';
import AiForm from './AiForm.jsx';
import LoginForm from './LoginForm.jsx';
import './index.css'; 

const { Header, Content, Footer } = Layout;

// --------------------------------------------------------
// 💡 NOUVEAU COMPOSANT : Garde de sécurité pour les routes URL
// --------------------------------------------------------
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useContext(AuthContext);

  // Si l'utilisateur n'est pas connecté, on le redirige immédiatement vers le login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// --------------------------------------------------------
// COMPOSANT : Barre de navigation
// --------------------------------------------------------
function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useContext(AuthContext);

  const menuItems = [
    { 
      key: '/', 
      icon: <HomeOutlined />, 
      label: <Link to="/">Bibliothèque</Link> 
    },
    ...(isAuthenticated ? [
      { 
        key: '/manuel', 
        icon: <EditOutlined />, 
        label: <Link to="/manuel">Rédaction Manuelle</Link> 
      },
      { 
        key: '/ai', 
        icon: <ThunderboltOutlined />, 
        label: <Link to="/ai">Génération IA</Link> 
      }
    ] : [])
  ];

  return (
    <Header style={{ background: '#fff', display: 'flex', alignItems: 'center', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', zIndex: 1 }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginRight: '40px', color: '#1677ff', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
        <RobotOutlined style={{ fontSize: '24px' }} /> AI Generator
      </div>
      
      <Menu mode="horizontal" selectedKeys={[location.pathname]} items={menuItems} style={{ flex: 1, borderBottom: 'none' }} />
      
      <div>
        {isAuthenticated ? (
          <Button 
            type="text" 
            danger 
            icon={<LogoutOutlined />} 
            onClick={() => { logout(); navigate('/'); }}
          >
            Déconnexion
          </Button>
        ) : (
          <Button 
            type="primary" 
            ghost 
            icon={<LoginOutlined />} 
            onClick={() => navigate('/login')}
          >
            Espace Admin
          </Button>
        )}
      </div>
    </Header>
  );
}

// --------------------------------------------------------
// RENDU DE L'APPLICATION
// --------------------------------------------------------
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { borderRadius: 8, colorPrimary: '#1677ff' } }}>
      <AuthProvider>
        <BrowserRouter>
          <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <Navigation />
            
            <Content style={{ padding: '40px 24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
              <Routes>
                {/* Routes publiques */}
                <Route path="/" element={<App />} />
                <Route path="/login" element={<LoginForm />} />
                
                {/* 💡 Routes sécurisées par le composant ProtectedRoute */}
                <Route path="/manuel" element={
                  <ProtectedRoute>
                    <ManualForm />
                  </ProtectedRoute>
                } />
                
                <Route path="/ai" element={
                  <ProtectedRoute>
                    <AiForm />
                  </ProtectedRoute>
                } />

                {/* Redirection automatique pour toutes les URLs inconnues */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Content>
            
            <Footer style={{ textAlign: 'center', color: '#888' }}>
              AI Content Generator ©{new Date().getFullYear()} - Propulsé par Symfony & React
            </Footer>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  </React.StrictMode>
);