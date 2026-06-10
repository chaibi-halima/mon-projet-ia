import { useState, useEffect } from 'react';
import { Card, Row, Col, Input, Select, Space, Spin, Empty, Tag, Typography } from 'antd';
import { CalendarOutlined, SearchOutlined, SortAscendingOutlined, TagsOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 💡 États pour la recherche et les filtres
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' ou 'oldest'

  // Récupération des articles depuis l'API Symfony
  useEffect(() => {
    fetch('https://localhost/api/articles')
      .then((res) => res.json())
      .then((data) => {
        // 💡 Validation stricte du format des données
        if (data && Array.isArray(data.member)) {
          // C'est le format standard propre à API Platform
          setArticles(data.member);
        } else if (Array.isArray(data)) {
          // C'veut dire que l'API a renvoyé un tableau brut []
          setArticles(data);
        } else {
          // C'est un objet (probablement une erreur 401, 500 ou autre)
          console.error("Format de données invalide reçu de l'API :", data);
          setArticles([]); // On force un tableau vide pour éviter le crash
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur réseau lors de la récup des articles:", err);
        setArticles([]);
        setLoading(false);
      });
  }, []);

  // --------------------------------------------------------
  // 🧠 LOGIQUE DE FILTRAGE ET DE TRI (Exécutée à chaque rendu)
  // --------------------------------------------------------
  const filteredAndSortedArticles = articles
    // 1. Filtre par texte (recherche dans le titre OU le contenu)
    .filter((article) => {
      const matchesSearch = 
        article.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        article.content?.toLowerCase().includes(searchText.toLowerCase());
      
      // 2. Filtre par catégorie (si ton entité possède un champ category ou tags)
      const matchesCategory = 
        selectedCategory === 'all' || 
        article.category?.name?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    })
    // 3. Tri par date
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.date || 0);
      
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  // Extraction dynamique des catégories existantes pour remplir le menu déroulant
  const categories = ['all', ...new Set(articles.map(a => a?.category?.name).filter(Boolean))];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" description="Chargement de la bibliothèque..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <Title level={2}>📚 Bibliothèque d'Articles</Title>
        <Paragraph type="secondary">Explorez, recherchez et triez vos contenus générés par IA ou rédigés à la main.</Paragraph>
      </div>

      {/* 🛠️ BARRE DE RECHERCHE ET DE FILTRES */}
      <Card style={{ marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          
          {/* Recherche textuelle */}
          <Col xs={24} md={10}>
            <Input
              placeholder="Rechercher un article par titre ou contenu..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Col>

          {/* Filtres de Tri et Catégories */}
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space wrap size="middle">
              
              {/* Menu déroulant des catégories */}
              <Space>
                <TagsOutlined style={{ color: '#8c8c8c' }} />
                <Select
                  value={selectedCategory}
                  onChange={(value) => setSelectedCategory(value)}
                  style={{ width: 160 }}
                  size="large"
                  options={categories.map(cat => ({
                    value: cat,
                    label: cat === 'all' ? 'Toutes les catégories' : cat
                  }))}
                />
              </Space>

              {/* Menu déroulant de tri par date */}
              <Space>
                <SortAscendingOutlined style={{ color: '#8c8c8c' }} />
                <Select
                  value={sortBy}
                  onChange={(value) => setSortBy(value)}
                  style={{ width: 180 }}
                  size="large"
                  options={[
                    { value: 'newest', label: 'Plus récents d\'abord' },
                    { value: 'oldest', label: 'Plus anciens d\'abord' },
                  ]}
                />
              </Space>

            </Space>
          </Col>
        </Row>
      </Card>

      {/* 📦 AFFICHAGE DE LA GRILLE D'ARTICLES */}
      {filteredAndSortedArticles.length === 0 ? (
        <Empty 
          description="Aucun article ne correspond à vos critères de recherche." 
          style={{ marginTop: '60px' }}
        />
      ) : (
        <Row gutter={[24, 24]}>
          {filteredAndSortedArticles.map((article) => (
            <Col xs={24} sm={12} lg={8} key={article.id}>
              <Card
                hoverable
                style={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  borderRadius: '12px',
                  flex: 1,
                }}
              >
                <div>
                  <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Badge de catégorie optionnel */}
                    <Tag color={article.category?.name ? 'blue' : 'default'}>
                      {article.category?.name || 'Général'}
                    </Tag>
                    
                    {/* Date formatée au propre */}
                    <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      <CalendarOutlined style={{ marginRight: '4px' }} />
                      {article.createdAt ? new Date(article.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </span>
                  </div>

                  <Title level={4} style={{ marginTop: 0, marginBottom: '10px' }}>
                    {article.title}
                  </Title>
                  
                  <Paragraph 
                    ellipsis={{ rows: 3 }} 
                    type="secondary" 
                    style={{ marginBottom: '20px' }}
                  >
                    {article.content}
                  </Paragraph>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

export default App;