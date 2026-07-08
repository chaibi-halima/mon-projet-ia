import { useState } from 'react';
import { useQuery, useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Select, Row, Col, DatePicker } from 'antd';
import { GET_CATEGORIES } from './graphql/articleQueries';
import { RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

function AiForm() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [generating, setGenerating] = useState(false);
  const client = useApolloClient();

  // Charger les catégories existantes via GraphQL pour le formulaire
  const { data: categoriesData } = useQuery(GET_CATEGORIES);
  const categories = categoriesData?.categories?.collection || [];

  const onFinish = async (values) => {
    setGenerating(true);
    const token = localStorage.getItem('jwt_token');

    // Préparation du payload attendu par le groupe 'article:write' de ton entité Symfony
    const payload = {
      title: values.title, // Sera utilisé comme "Topic" par ton Messenger
      category: values.category ?? null, // IRI de la catégorie
      tone: values.tone || 'professionnel',
      length: values.length || 'moyen',
      imageUrl: values.imageUrl || null,
      scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : null,
    };

    try {
      // 💡 L'URL exacte de ton uriTemplate API Platform
      const response = await fetch('https://localhost/api/articles/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/ld+json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      setGenerating(false);

      if (response.ok) {
        messageApi.success(
          values.scheduledAt 
            ? "Article programmé ! Il sera publié après génération, à la date choisie." 
            : "Ordre de génération envoyé à l'IA avec succès !"
        );
        form.resetFields();
        client.cache.evict({ fieldName: 'articles' });
        client.cache.evict({ fieldName: 'categories' });
        client.cache.gc();
        navigate('/'); 
      } else {
        const errData = await response.json();
        messageApi.error(`Erreur serveur : ${errData['hydra:description'] || 'Impossible de générer'}`);
      }
    } catch (error) {
      setGenerating(false);
      messageApi.error("Erreur réseau lors de la communication avec l'API.");
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {contextHolder}
      <Card style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <RobotOutlined style={{ fontSize: '40px', color: '#1677ff', marginBottom: '12px' }} />
          <Title level={3} style={{ marginTop: 0 }}>Génération par Intelligence Artificielle</Title>
          <Paragraph type="secondary">
            Saisissez votre sujet. Le State Processor et Symfony Messenger s'occupent de générer l'article via Ollama en arrière-plan.
          </Paragraph>
        </div>
        
        <Form form={form} layout="vertical" onFinish={onFinish} defaultvalues={{ tone: 'professionnel', length: 'moyen' }}>
          
          <Form.Item name="title" label="Sujet de l'article (Sera fourni à l'IA)" rules={[{ required: true, message: 'Veuillez saisir un sujet' }]}>
            <Input placeholder="Ex: Les avancées de la physique quantique ou L'impact du télétravail" size="large" />
          </Form.Item>

          <Form.Item name="category" label="Catégorie cible">
            <Select placeholder="Sélectionnez la catégorie de l'article" size="large" allowClear>
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 🌟 NOUVEAU : Sélection du TON et de la LONGUEUR pour correspondre à ton Handler PHP */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tone" label="Ton de l'écriture" initialValue="professionnel">
                <Select size="large">
                  <Select.Option value="professionnel">💼 Professionnel</Select.Option>
                  <Select.Option value="amical">😊 Amical / Décontracté</Select.Option>
                  <Select.Option value="technique">🔬 Technique / Scientifique</Select.Option>
                  <Select.Option value="enthousiaste">🔥 Enthousiaste / Vendeur</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="length" label="Longueur souhaitée" initialValue="moyen">
                <Select size="large">
                  <Select.Option value="court">⏱️ Court (environ 200 mots)</Select.Option>
                  <Select.Option value="moyen">📝 Moyen (environ 500 mots)</Select.Option>
                  <Select.Option value="long">📚 Long (1000+ mots)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="imageUrl" label="URL de l'image de couverture (Optionnel)">
            <Input placeholder="https://images.unsplash.com/... (Laissé vide, Picsum s'en chargera)" size="large" />
          </Form.Item>

          <Form.Item name="scheduledAt" label="Publier plus tard (optionnel)">
            <DatePicker 
              showTime 
              format="DD/MM/YYYY HH:mm" 
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              placeholder="Laisser vide pour publier immédiatement"
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>
  
          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
            <Button type="primary" htmlType="submit" size="large" icon={<RobotOutlined />} loading={generating}>
              {generating ? "Envoi à l'IA..." : "Lancer la génération asynchrone"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default AiForm;