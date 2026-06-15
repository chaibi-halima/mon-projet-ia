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

// 💡 On sépare à nouveau pour contourner le bug d'export de Vite
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core';
import { ApolloProvider } from '@apollo/client/react';
import { setContext } from '@apollo/client/link/context';

const { Header, Content, Footer } = Layout;

// --------------------------------------------------------
// 🛡️ GARDE DE SÉCURITÉ : Protection des routes URL
// --------------------------------------------------------
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// --------------------------------------------------------
// 🧭 COMPOSANT : Barre de navigation
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
// 📡 CONFIGURATION APOLLO CLIENT (GRAPHQL)
// --------------------------------------------------------
const httpLink = createHttpLink({
  uri: 'https://localhost/api/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('jwt_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// --------------------------------------------------------
// 🪐 RENDU GLOBAL DE L'APPLICATION
// --------------------------------------------------------
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <ConfigProvider theme={{ token: { borderRadius: 8, colorPrimary: '#1677ff' } }}>
        <AuthProvider>
          <BrowserRouter>
            <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
              <Navigation />
              
              <Content style={{ padding: '40px 24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                <Routes>
                  <Route path="/" element={<App />} />
                  <Route path="/login" element={<LoginForm />} />
                  
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
    </ApolloProvider>
  </React.StrictMode>
);