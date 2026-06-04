import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { EditOutlined, SendOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

function ManualForm() {
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    messageApi.loading({ content: 'Publication en cours...', key: 'publish' });

    try {
      const response = await fetch('https://localhost/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/ld+json' },
        body: JSON.stringify({ title: values.title, content: values.content })
      });

      if (response.ok) {
        messageApi.success({ content: 'Article publié avec succès !', key: 'publish', duration: 2 });
        setTimeout(() => navigate('/'), 1000); // Redirection après 1s
      } else {
        messageApi.error({ content: 'Échec de la publication.', key: 'publish', duration: 3 });
      }
    } catch (error) {
      messageApi.error({ content: 'Erreur réseau.', key: 'publish', duration: 3 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {contextHolder}
      
      <Card variant="outlined" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <EditOutlined style={{ fontSize: '40px', color: '#1677ff', marginBottom: '16px' }} />
          <Title level={2} style={{ margin: 0 }}>Rédaction Manuelle</Title>
          <Paragraph type="secondary" style={{ fontSize: '16px', mt: 2 }}>
            Prenez la plume et ajoutez directement votre contenu à la base de données.
          </Paragraph>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="title"
            label={<span style={{ fontWeight: 600 }}>Titre de l'article</span>}
            rules={[{ required: true, message: 'Veuillez saisir un titre.' }]}
          >
            <Input placeholder="Un titre accrocheur..." />
          </Form.Item>

          <Form.Item
            name="content"
            label={<span style={{ fontWeight: 600 }}>Contenu de l'article</span>}
            rules={[{ required: true, message: 'Veuillez saisir le contenu.' }]}
          >
            <Input.TextArea rows={8} placeholder="Écrivez votre chef-d'œuvre ici..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<SendOutlined />}
              style={{ width: '100%', height: '50px', fontSize: '16px', fontWeight: 'bold' }}
            >
              Publier l'article
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ManualForm;