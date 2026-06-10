import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Select, Card, Typography, Space } from 'antd';
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

function AiForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    fetch('https://localhost/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.member || []));
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    const token = localStorage.getItem('jwt_token');

    try {
      messageApi.loading({ content: 'Transmission au Worker en cours...', key: 'ai' });

      // 💡 On inclut 'tone' et 'length' dans le JSON !
      const articleData = {
        title: values.topic, 
        content: "Génération de l'article en cours par l'IA...", 
        category: values.category,
        tone: values.tone,     // 👈 Nouveau
        length: values.length  // 👈 Nouveau
      };

      const apiResponse = await fetch('https://localhost/api/articles/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ld+json',
          'Accept': 'application/ld+json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(articleData)
      });

      if (apiResponse.ok) {
        messageApi.success({ content: 'Tâche envoyée ! L\'article apparaîtra d\'ici peu.', key: 'ai', duration: 3 });
        form.resetFields();
      } else {
        throw new Error("Erreur lors de l'envoi au serveur");
      }
    } catch (error) {
      messageApi.error({ content: `Erreur : ${error.message}`, key: 'ai', duration: 5 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ maxWidth: 600, margin: '0 auto', marginTop: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      {contextHolder}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <RobotOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
        <Title level={3} style={{ marginTop: 0 }}>Assistant de Rédaction IA</Title>
        <Text type="secondary">Choisissez vos paramètres, l'IA s'occupe du reste.</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ tone: 'professionnel', length: 'moyen' }}>
        <Form.Item name="topic" label="Sujet de l'article" rules={[{ required: true, message: 'Le sujet est requis.' }]}>
          <Input placeholder="Ex: Les avantages de Docker en 2026..." size="large" />
        </Form.Item>

        <Form.Item name="category" label="Catégorie" rules={[{ required: true }]}>
          <Select placeholder="Sélectionnez une catégorie" size="large">
            {categories.map(cat => (
              <Select.Option key={cat.id} value={`/api/categories/${cat.id}`}>{cat.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* 💡 NOUVEAUX CHAMPS */}
        <Space style={{ width: '100%' }} size="middle">
          <Form.Item name="tone" label="Ton de l'article" style={{ width: '100%' }}>
            <Select size="large">
              <Select.Option value="professionnel">💼 Professionnel</Select.Option>
              <Select.Option value="humoristique">😂 Humoristique</Select.Option>
              <Select.Option value="vulgarisation">🎓 Vulgarisation simple</Select.Option>
              <Select.Option value="poétique">✨ Poétique</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="length" label="Longueur" style={{ width: '100%' }}>
            <Select size="large">
              <Select.Option value="très court (1 paragraphe)">Court</Select.Option>
              <Select.Option value="moyen (3 paragraphes)">Moyen</Select.Option>
              <Select.Option value="long et détaillé (5 paragraphes)">Long</Select.Option>
            </Select>
          </Form.Item>
        </Space>

        <Form.Item style={{ marginTop: '20px', marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" size="large" block loading={loading} icon={<ThunderboltOutlined />}>
            Générer l'article
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default AiForm;