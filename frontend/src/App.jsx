import { useEffect, useState } from 'react';
import { Card, Typography, Spin, Row, Col, Tooltip } from 'antd';
import { SyncOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// --------------------------------------------------------
// 💡 NOUVEAU COMPOSANT : Gère une seule carte d'article
// --------------------------------------------------------
function ArticleCard({ article }) {
  // État local pour savoir si l'article est déplié ou non
  const [expanded, setExpanded] = useState(false);
  
  const MAX_LENGTH = 200; // Nombre de caractères avant de couper
  const isLongText = article.content && article.content.length > MAX_LENGTH;
  
  // Le texte affiché dépend de l'état "expanded"
  const displayContent = expanded || !isLongText 
    ? article.content 
    : `${article.content.substring(0, MAX_LENGTH)}...`;

  return (
    <Card 
      // 💡 1. Tooltip sur le titre : affiche le titre complet au survol (en bleu)
      title={
        <Tooltip title={article.title} placement="topLeft" color="#1677ff">
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {article.title}
          </div>
        </Tooltip>
      } 
      hoverable
      extra={<Text type="secondary">ID: {article.id}</Text>}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flexGrow: 1, display: 'flex', flexDirection: 'column' } }}
    >
      {article.content && article.content.includes('⏳') ? (
        <div style={{ textAlign: 'center', padding: '20px 0', margin: 'auto' }}>
          <Spin indicator={<SyncOutlined spin style={{ fontSize: 24, color: '#faad14' }} />} />
          <div style={{ marginTop: '12px', color: '#d48806', fontWeight: 'bold' }}>L'IA rédige...</div>
        </div>
      ) : (
        <>
          <div style={{ whiteSpace: 'pre-wrap', color: 'rgba(0, 0, 0, 0.88)', flexGrow: 1 }}>
            {displayContent}
          </div>
          
          {/* 💡 2. Bouton Voir plus / Voir moins */}
          {isLongText && (
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <a 
                onClick={() => setExpanded(!expanded)} 
                style={{ fontWeight: 600, color: '#1677ff', background: '#e6f4ff', padding: '4px 12px', borderRadius: '12px' }}
              >
                {expanded ? 'Voir moins ↑' : 'Voir plus ↓'}
              </a>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// --------------------------------------------------------
// COMPOSANT PRINCIPAL : La page d'accueil
// --------------------------------------------------------
function App() {
  const [articles, setArticles] = useState([]);

  const loadArticles = () => {
    fetch('https://localhost/api/articles')
      .then(res => res.json())
      .then(data => {
        if (data && data.member) setArticles(data.member);
        else if (data && data['hydra:member']) setArticles(data['hydra:member']);
        else if (Array.isArray(data)) setArticles(data);
        else setArticles([]);
      })
      .catch(() => setArticles([]));
  };

  useEffect(() => {
    loadArticles();
    const interval = setInterval(loadArticles, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
        <FileTextOutlined style={{ fontSize: '28px', color: '#1677ff' }} />
        <Title level={2} style={{ margin: 0 }}>Bibliothèque d'articles</Title>
      </div>

      <Row gutter={[24, 24]} align="stretch">
        {articles.length === 0 ? (
          <Col span={24} style={{ textAlign: 'center', padding: '60px 0', color: '#888', background: '#fff', borderRadius: '8px' }}>
            Aucun article pour le moment. Utilisez le menu pour en créer un !
          </Col>
        ) : (
          articles.map(article => (
            <Col xs={24} sm={24} md={12} lg={12} xl={12} xxl={12} key={article.id}>
              {/* 💡 On appelle notre nouveau sous-composant ici */}
              <ArticleCard article={article} />
            </Col>
          ))
        )}
      </Row>
    </>
  );
}

export default App;