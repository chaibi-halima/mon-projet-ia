import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined, UserOutlined, LoginOutlined } from '@ant-design/icons';
import { AuthContext } from './AuthContext.js';

const { Title, Paragraph } = Typography;

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values) => {
    setLoading(true);
    messageApi.loading({ content: 'Vérification de vos identifiants...', key: 'auth' });

    try {
      const response = await fetch('https://localhost/api/login_check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password
        })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        messageApi.success({ content: 'Connexion réussie ! Bienvenue.', key: 'auth', duration: 1.5 });
        login(data.token); // On enregistre le token globalement
        setTimeout(() => navigate('/'), 1000); // Redirection vers l'accueil
      } else {
        messageApi.error({ content: data.message || 'Identifiants incorrects.', key: 'auth', duration: 3 });
      }
    } catch (error) {
      messageApi.error({ content: 'Erreur réseau impossible de joindre l\'API.', key: 'auth', duration: 3 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '60px auto 0 auto' }}>
      {contextHolder}
      <Card variant="outlined" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)', borderRadius: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={3} style={{ margin: 0, color: '#1677ff' }}>Connexion Espace Admin</Title>
          <Paragraph type="secondary">Connectez-vous pour publier ou générer du contenu.</Paragraph>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Veuillez saisir votre email.' },
              { type: 'email', message: 'Veuillez saisir un email valide.' }
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="admin@test.com" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Veuillez saisir votre mot de passe.' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="Mot de passe" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<LoginOutlined />}
              style={{ width: '100%', height: '48px', fontWeight: 'bold' }}
            >
              Se connecter
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default LoginForm;