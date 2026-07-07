import { useState, useContext, useEffect, useRef } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { 
  Card, Row, Col, Input, Select, Space, Spin, Empty, 
  Tag, Typography, Button, Modal, Popconfirm, Form, message, Pagination, Statistic, Tooltip
} from 'antd';
import { 
  CalendarOutlined, SearchOutlined, SortAscendingOutlined, 
  TagsOutlined, BookOutlined, EditOutlined, DeleteOutlined,
  FileTextOutlined, RedoOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { GET_ARTICLES, GET_CATEGORIES, UPDATE_ARTICLE, DELETE_ARTICLE } from './graphql/articleQueries';
import { AuthContext } from './AuthContext.js'; // 💡 Pour gérer l'expiration proprement

const DEFAULT_IMAGE = 'https://placehold.co/800x400/f0f2f5/8c8c8c?text=Image+non+fournie';
const { Title, Paragraph } = Typography;

function App() {
  // États des filtres et pagination
  const [searchText, setSearchText] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // États des Modales
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  
  const [editForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { logout } = useContext(AuthContext);
  const token = localStorage.getItem('jwt_token');

  const client = useApolloClient();

  // --------------------------------------------------------
  // 📡 REQUÊTES GRAPHQL (APOLLO CLIENT)
  // --------------------------------------------------------
  
  useEffect(() => {
    // On lance un chrono de 300ms
    const timer = setTimeout(() => {
      setSearchText(searchInputValue);
      setCurrentPage(1); // On reset la page à 1 quand la recherche change vraiment
    }, 300);

    // Si l'utilisateur tape une nouvelle lettre avant les 300ms, 
    // on détruit le chrono précédent et on en relance un neuf.
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  // 📡 MUTATIONS GRAPHQL
  const [mutateDelete] = useMutation(DELETE_ARTICLE, {
    onCompleted: () => {
      messageApi.success('Article supprimé !');
      refetchArticles(); // Force la grille à se recharger proprement
    },
    onError: (err) => messageApi.error(`Erreur de suppression : ${err.message}`)
  });

  const [mutateUpdate] = useMutation(UPDATE_ARTICLE, {
    onCompleted: () => {
      messageApi.success('Article modifié !');
      refetchArticles(); // Synchronise la modification à l'écran
      setIsEditModalVisible(false);
    },
    onError: (err) => messageApi.error(`Erreur de modification : ${err.message}`)
  });

  // 1. Chargement des articles (avec filtres, tri et polling de 5s)
  const { loading, data, refetch: refetchArticles, startPolling, stopPolling } = useQuery(GET_ARTICLES, {
    variables: { 
      page: currentPage,
      title: searchText || null,
      categoryName: selectedCategory === 'all' ? null : selectedCategory,
      order: sortBy === 'newest' ? [{ createdAt: 'desc' }] : [{ createdAt: 'asc' }]
    },
    skip: !token, // 🚀 Plus de ligne "pollInterval" ici !
    onError: (err) => {
      if (err.message.includes('401') || err.networkError?.statusCode === 401) {
        localStorage.removeItem('jwt_token');
        logout(); 
        messageApi.error("Votre session a expiré. Veuillez vous reconnecter.");
      }
    }
  }); 

  // 2. Chargement des catégories pour le filtre et les statistiques
  const { data: categoriesData } = useQuery(GET_CATEGORIES, {
    skip: !token,
  });

  // Extraction des données GraphQL pour ton rendu
  const articles = data?.articles?.collection || data?.articles || [];
  const totalItems = data?.articles?.paginationInfo?.totalCount || 0;
  
  const categories = categoriesData?.categories?.collection || [];

  // 🔄 Gestionnaire de Polling Intelligent avec Verrou anti-réinitialisation
  const hasProcessingArticles = articles.some(
    article => article.status === 'processing' || article.status === 'pending'
  );

  const prevStatusesRef = useRef({});

  // 🔔 Détection des transitions de statut → notification
  useEffect(() => {
    articles.forEach(article => {
      const prevStatus = prevStatusesRef.current[article.id];
      const wasGenerating = prevStatus === 'processing' || prevStatus === 'pending';

      if (wasGenerating && article.status === 'success') {
        messageApi.success(`✅ L'article "${article.title}" est prêt !`);
      }

      if (wasGenerating && article.status === 'failed') {
        messageApi.error(`❌ La génération de "${article.title}" a échoué.`);
      }
    });

    // Mise à jour de la ref pour la prochaine comparaison —
    // fait ICI, dans l'effet, jamais pendant le render
    const map = {};
    articles.forEach(a => { map[a.id] = a.status; });
    prevStatusesRef.current = map;
  }, [articles]);

  // 2) Effet dédié uniquement au start/stop, basé sur un booléen stable
  useEffect(() => {
    if (token && hasProcessingArticles) {
      startPolling(5000);
    } else {
      stopPolling();
    }
  }, [hasProcessingArticles, token, startPolling, stopPolling]);

  // 3) Cleanup séparé, exécuté UNIQUEMENT au démontage réel du composant
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleRetry = async (id) => {
    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch(`https://localhost${id}/retry`, { // 👈 id contient déjà /api/articles/2
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        messageApi.success('Régénération relancée !');
        client.cache.evict({ fieldName: 'articles' });
        client.cache.gc();
        refetchArticles(); // relance immédiatement le fetch pour voir passer le statut à 'processing'
      } else {
        const errData = await response.json();
        messageApi.error(`Erreur : ${errData['hydra:description'] || 'Impossible de relancer'}`);
      }
    } catch (error) {
      messageApi.error("Erreur réseau lors de la relance.");
    }
  };

  // ⚡ GESTION DES ACTIONS (VERSION 100% GRAPHQL)
  
  // Suppression
  const handleDelete = (id) => {
    mutateDelete({ variables: { id: id } });

    // Si on supprime le dernier article d'une page, on recule d'une page
    if (articles.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Ouverture modale édition
  const openEditModal = (article) => {
    setEditingArticle(article);
    editForm.setFieldsValue({
      title: article.title,
      content: article.content,
      category: article.category ? article.category.id : undefined, // 💡 GraphQL utilise .id (qui est l'IRI sous API Platform)
      imageUrl: article.imageUrl
    });
    setIsEditModalVisible(true);
  };

  // Soumission édition
  const handleEditSubmit = (values) => {
    mutateUpdate({
      variables: {
        id: editingArticle.id,
        title: values.title,
        content: values.content,
        category: values.category || null, // IRI de la catégorie (ex: "/api/categories/3")
        imageUrl: values.imageUrl || null
      }
    });
  };

  return (
    <div>
      {contextHolder}
      
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <Title level={2}>📚 Bibliothèque d'Articles</Title>
        <Paragraph type="secondary">Explorez votre catalogue propulsé par un filtrage ultra-performant côté serveur.</Paragraph>
      </div>

      {/* --------------------------------------------------------
          📊 BLOC STATISTIQUES RECONSTRUIT (DYNAMIQUE)
         -------------------------------------------------------- */}
      {token && (
        <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} md={12}>
            <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
              <Statistic 
                title="Total des Articles" 
                value={totalItems} 
                loading={loading && articles.length === 0}
                prefix={<FileTextOutlined style={{ color: '#1677ff' }} />} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12}>
            <Card title="Répartition par catégories" bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }} size="small">
              <Space wrap style={{ marginTop: '4px' }}>
                {categories.length === 0 ? (
                  <span style={{ color: '#888' }}>Aucune catégorie</span>
                ) : (
                  categories.map(cat => (
                    <Tag color="blue" key={cat.id} style={{ padding: '4px 8px', fontSize: '13px' }}>
                      <strong>{cat.name}</strong> : {cat.articles?.paginationInfo?.totalCount || 0}
                    </Tag>
                  ))
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* Barre de recherche */}
      <Card style={{ marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Input
              placeholder="Rechercher par titre..."
              prefix={<SearchOutlined />} 
              value={searchInputValue}
              onChange={(e) => {
                setSearchInputValue(e.target.value);
              }}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={24} md={14} style={{ textAlign: 'right' }}>
            <Space wrap size="middle">
              <Space>
                <TagsOutlined />
                <Select 
                  value={selectedCategory} 
                  onChange={(value) => {
                    setSelectedCategory(value);
                    setCurrentPage(1);
                  }} 
                  style={{ width: 180 }} 
                  size="large"
                >
                  <Select.Option value="all">Toutes les catégories</Select.Option>
                  {categories.map(cat => (
                    <Select.Option key={cat.id} value={cat.name}>{cat.name}</Select.Option>
                  ))}
                </Select>
              </Space>
              <Space>
                <SortAscendingOutlined />
                <Select 
                  value={sortBy} 
                  onChange={(value) => {
                    setSortBy(value);
                    setCurrentPage(1);
                  }} 
                  style={{ width: 190 }} 
                  size="large" 
                  options={[
                    { value: 'newest', label: 'Plus récents d\'abord' }, 
                    { value: 'oldest', label: 'Plus anciens d\'abord' }
                  ]} 
                />
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Grille d'articles avec Spinner de chargement Apollo */}
      <Spin spinning={loading && articles.length === 0} tip="Chargement des données...">
        {!token ? (
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Empty description="Veuillez vous connecter à l'Espace Admin pour consulter la bibliothèque d'articles." />
          </Card>
        ) : articles.length === 0 ? (
          <Empty description="Aucun article trouvé." style={{ marginTop: '60px', marginBottom: '60px' }} />
        ) : (
          <>
            <Row gutter={[24, 24]}>
              {articles.map((article) => (
                <Col xs={24} sm={12} lg={8} key={article.id}>
                  <Card
                    hoverable
                    cover={
                      <img 
                        alt={article.title} 
                        src={article.imageUrl || DEFAULT_IMAGE} 
                        style={{ height: '200px', objectFit: 'cover' }} 
                      />
                    }
                    style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden' }}
                    bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                  >
                    <div>
                      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tag color={article.category ? 'blue' : 'default'}>
                          {article.category?.name || 'Général'}
                        </Tag>
                        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          <CalendarOutlined style={{ marginRight: '4px' }} />
                          {article.createdAt ? new Date(article.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                        </span>
                      </div>

                      <Title level={4} style={{ marginTop: 0, marginBottom: '10px', height: '50px', overflow: 'hidden', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {article.title}
                      </Title>
                      
                      <Paragraph type="secondary" style={{ marginBottom: '20px' }}>
                        {article.content ? article.content.replace(/[#*`\-_]/g, '').substring(0, 120) + '...' : ''}
                      </Paragraph>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                      <Space size="small">
                        <Tooltip title="Modifier">
                          <Button type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => openEditModal(article)} />
                        </Tooltip>

                        {article.status === 'failed' && (
                          <Tooltip title="Régénérer">
                            <Button type="text" icon={<RedoOutlined style={{ color: '#fa8c16' }} />} onClick={() => handleRetry(article.id)} />
                          </Tooltip>
                        )}

                        <Popconfirm title="Supprimer ?" onConfirm={() => handleDelete(article.id)} okText="Oui" cancelText="Non" okButtonProps={{ danger: true }}>
                          <Tooltip title="Supprimer">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Tooltip>
                        </Popconfirm>
                      </Space>

                      <Button type="primary" size="small" icon={<BookOutlined />} onClick={() => { setSelectedArticle(article); setIsModalVisible(true); }}>
                        Lire
                      </Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Pagination de ton composant d'origine */}
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
              <Pagination 
                current={currentPage} 
                pageSize={6} 
                total={totalItems} 
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false} 
              />
            </div>
          </>
        )}
      </Spin>

      {/* Modales de lecture et d'édition */}
      <Modal open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} width={800}>
        {selectedArticle && (
          <>
            <div style={{ margin: '-24px -24px 20px -24px' }}>
              <img 
                src={selectedArticle.imageUrl || DEFAULT_IMAGE} 
                alt="Couverture" 
                style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} 
              />
            </div>
            
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #f0f0f0', paddingBottom: '20px' }}>
              <Tag color={selectedArticle.category ? 'blue' : 'default'} style={{ marginBottom: '10px' }}>{selectedArticle.category?.name || 'Général'}</Tag>
              <Title level={2} style={{ marginTop: 0 }}>{selectedArticle.title}</Title>
              <span style={{ color: '#8c8c8c' }}><CalendarOutlined style={{ marginRight: '8px' }} />Publié le {new Date(selectedArticle.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
            <div style={{ fontSize: '16px', lineHeight: '1.6' }}><ReactMarkdown>{selectedArticle.content}</ReactMarkdown></div>
          </>
        )}
      </Modal>

      <Modal title="Modifier l'article" open={isEditModalVisible} onCancel={() => setIsEditModalVisible(false)} okText="Sauvegarder" cancelText="Annuler" onOk={() => editForm.submit()}>
        <Form form={editForm} onFinish={handleEditSubmit} layout="vertical" style={{ marginTop: '20px' }}>
          <Form.Item name="title" label="Titre" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="Catégorie">
            <Select placeholder="Sélectionnez une catégorie">
              {categories.map(cat => <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="content" label="Contenu" rules={[{ required: true }]}><Input.TextArea rows={8} /></Form.Item>
          <Form.Item name="imageUrl" label="URL de l'image de couverture">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default App;