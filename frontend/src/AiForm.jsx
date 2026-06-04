import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, message } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

function AiForm() {
  const [aiTopic, setAiTopic] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  
  // 💡 Hook pour rediriger l'utilisateur
  const navigate = useNavigate();

  const handleAiSubmit = async () => {
    if (!aiTopic) return messageApi.warning('Veuillez entrer un sujet.');
    setLoadingAi(true);
    messageApi.loading({ content: 'Lancement de l\'IA...', key: 'aiProcess' });

    try {
      const response = await fetch('https://localhost/api/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: aiTopic })
      });

      if (response.ok) {
        messageApi.success({ content: 'Llama 3.2 a commencé à écrire !', key: 'aiProcess', duration: 2 });
        // Redirection vers l'accueil après 1 seconde pour voir le sablier ⏳
        setTimeout(() => navigate('/'), 1000); 
      } else {
        messageApi.error({ content: 'Échec de la demande.', key: 'aiProcess', duration: 3 });
      }
    } catch (error) {
      messageApi.error({ content: 'Erreur réseau.', key: 'aiProcess', duration: 3 });
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {contextHolder}
      
      <Card 
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        variant="outlined"
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <ThunderboltOutlined style={{ fontSize: '40px', color: '#0050b3', marginBottom: '16px' }} />
          <Title level={2} style={{ margin: 0 }}>Génération IA</Title>
          <Paragraph style={{ fontSize: '16px', marginTop: '8px' }}>
            Confiez la rédaction de votre prochain article à votre assistant local Llama 3.2.
          </Paragraph>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TextArea 
            rows={6} 
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder="Ex: Rédige un article optimisé SEO de 500 mots sur les bienfaits du thé vert matcha..."
            disabled={loadingAi}
            style={{ fontSize: '16px', padding: '16px' }}
          />
          <Button 
            type="primary" 
            icon={<ThunderboltOutlined />} 
            loading={loadingAi} 
            onClick={handleAiSubmit}
            size="large"
            style={{ height: '54px', fontSize: '18px', fontWeight: 'bold' }}
          >
            Lancer la rédaction
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default AiForm;