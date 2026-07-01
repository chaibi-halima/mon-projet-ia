import { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { 
  Card, Row, Col, Input, Select, Space, Spin, Empty, 
  Tag, Typography, Button, Modal, Popconfirm, Form, message, Pagination, Statistic 
} from 'antd';
import { 
  CalendarOutlined, SearchOutlined, SortAscendingOutlined, 
  TagsOutlined, BookOutlined, EditOutlined, DeleteOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { GET_ARTICLES, GET_CATEGORIES, UPDATE_ARTICLE, DELETE_ARTICLE } from './graphql/articleQueries';
import { AuthContext } from './AuthContext.js';

const DEFAULT_IMAGE = 'https://placehold.co/800x400/f0f2f5/8c8c8c?text=Image+non+fournie';
const { Title, Paragraph } = Typography;

function App() {
  // États des filtres et pagination
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // États des Modales
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  
  // 🚀 TEMP ZONE : State de transition pour forcer le rafraîchissement visuel mot par mot
  const [liveUpdates, setLiveUpdates] = useState({});

  const [editForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { logout } = useContext(AuthContext);
  const token = localStorage.getItem('jwt_token');

  // --------------------------------------------------------
  // 📡 MUTATIONS GRAPHQL (APOLLO CLIENT)
  // --------------------------------------------------------
  const [mutateDelete] = useMutation(DELETE_ARTICLE, {
    onCompleted: () => {
      messageApi.success('Article supprimé !');
      refetchArticles(); 
    },
    onError: (err) => messageApi.error(`Erreur de suppression : ${err.message}`)
  });

  const [mutateUpdate] = useMutation(UPDATE_ARTICLE, {
    onCompleted: () => {
      messageApi.success('Article modifié !');
      refetchArticles(); 
      setIsEditModalVisible(false);
    },
    onError: (err) => messageApi.error(`Erreur de modification : ${err.message}`)
  });

  // 📡 REQUÊTE PRINCIPALE DES ARTICLES
  const { loading, data, refetch: refetchArticles, client } = useQuery(GET_ARTICLES, {
    variables: { 
      page: currentPage,
      title: searchText || null,
      categoryName: selectedCategory === 'all' ? null : selectedCategory,
      order: sortBy === 'newest' ? [{ createdAt: 'desc' }] : [{ createdAt: 'asc' }]
    },
    skip: !token,
    onError: (err) => {
      if (err.message.includes('401') || err.networkError?.statusCode === 401) {
        localStorage.removeItem('jwt_token');
        logout(); 
        messageApi.error("Votre session a expiré. Veuillez vous reconnecter.");
      }
    }
  });

  const articlesList = data?.articles?.collection || data?.articles || [];

  // Référence stable pour isoler la liste du useEffect
  const articlesRef = useRef(articlesList);
  useEffect(() => {
    articlesRef.current = articlesList;
  }, [articlesList]);

  // 🚀 FILET DE SÉCURITÉ : On écoute TOUS les articles visibles sur la page en cours
  const pageIdsString = useMemo(() => {
    return articlesList.map(article => article.id).join(',');
  }, [articlesList]);

  // ⚡ ÉCOUTEUR MERCURE PERMANENT ET ROBUSTE
  // ⚡ ÉCOUTEUR MERCURE PERMANENT ET ROBUSTE
  useEffect(() => {
    if (!pageIdsString) return;

    const ids = pageIdsString.split(',');
    const activeEventSources = [];

    ids.forEach((id) => {
      // 🚀 ON RÉCUPÈRE TON DBID TOUT NEUF :
      // On cherche l'article correspondant à l'IRI dans notre référence stable
      const articleFound = articlesRef.current.find(a => a.id === id);
      const numericId = articleFound?.dbId;

      // Sécurité : si GraphQL n'a pas encore chargé le dbId, on ne lance pas l'écouteur
      if (!numericId) return;

      const url = new URL('http://localhost:3005/.well-known/mercure');
      // 🎯 On utilise ton dbId backend parfait pour le topic Mercure
      url.searchParams.append('topic', `http://mon-projet.com/article/${numericId}`);

      const eventSource = new EventSource(url);
      console.log(`📡 [Mercure] Écoute active pour l'article ID réel: ${numericId}`);

      eventSource.onmessage = (event) => {
        const streamData = JSON.parse(event.data);
        console.log(`📥 [Mercure] Flux reçu pour l'article ${numericId}`);

        setLiveUpdates((prev) => ({
          ...prev,
          [id]: {
            content: streamData.content || '',
            status: streamData.status
          }
        }));

        if (streamData.status === 'success' || streamData.status === 'failed') {
          console.log(`🛑 [Mercure] Fin détectée pour l'article ${numericId}`);
          eventSource.close();
          
          refetchArticles().then(() => {
            setLiveUpdates((prev) => {
              const clone = { ...prev };
              delete clone[id];
              return clone;
            });
          });
        }
      };

      eventSource.onerror = (err) => {
        console.error(`❌ [Mercure] Erreur sur l'article ${numericId}:`, err);
      };

      activeEventSources.push(eventSource);
    });

    return () => {
      activeEventSources.forEach((es) => es.close());
    };
  }, [pageIdsString, refetchArticles]);

  // Chargement secondaire des catégories
  const { data: categoriesData } = useQuery(GET_CATEGORIES, {
    skip: !token,
  });

  const articles = data?.articles?.collection || [];
  const totalItems = data?.articles?.paginationInfo?.totalCount || 0;
  const categories = categoriesData?.categories?.collection || [];

  const handleDelete = (id) => {
    mutateDelete({ variables: { id: id } });
    if (articles.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const openEditModal = (article) => {
    setEditingArticle(article);
    editForm.setFieldsValue({
      title: article.title,
      content: liveUpdates[article.id]?.content ?? article.content,
      category: article.category ? article.category.id : undefined,
      imageUrl: article.imageUrl
    });
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = (values) => {
    mutateUpdate({
      variables: {
        id: editingArticle.id,
        title: values.title,
        content: values.content,
        category: values.category || null,
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

      {/* 📊 BLOC STATISTIQUES */}
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

      {/* Barre de filtrage */}
      <Card style={{ marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Input
              placeholder="Rechercher par titre..."
              prefix={<SearchOutlined />} 
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
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

      {/* Grille d'affichage */}
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
              {articles.map((article) => {
                // 🚀 Fusion à la volée du cache Apollo et du flux en temps réel
                const currentContent = liveUpdates[article.id]?.content ?? article.content;
                const currentStatus = liveUpdates[article.id]?.status ?? article.status;
                const isProcessing = currentStatus === 'processing' || currentStatus === 'pending';

                return (
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
                          <Tag color={isProcessing ? 'orange' : (article.category ? 'blue' : 'default')}>
                            {isProcessing ? 'Écriture en cours...' : (article.category?.name || 'Général')}
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
                          {currentContent 
                            ? currentContent.replace(/[#*`\-_]/g, '').substring(0, 120) + '...' 
                            : 'Génération du contenu par l\'IA...'}
                        </Paragraph>
                      </div>
                      
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                        <Space size="middle">
                          <Button type="text" disabled={isProcessing} icon={<EditOutlined style={{ color: isProcessing ? '#ccc' : '#1890ff' }} />} onClick={() => openEditModal(article)}>Modifier</Button>
                          <Popconfirm title="Supprimer ?" disabled={isProcessing} onConfirm={() => handleDelete(article.id)} okText="Oui" cancelText="Non" okButtonProps={{ danger: true }}>
                            <Button type="text" danger disabled={isProcessing} icon={<DeleteOutlined />}>Supprimer</Button>
                          </Popconfirm>
                        </Space>
                        <Button type="primary" size="small" icon={<BookOutlined />} onClick={() => { setSelectedArticle(article); setIsModalVisible(true); }}>Lire</Button>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>

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

      {/* Modale de lecture avec streaming synchrone */}
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
              <Tag color={(liveUpdates[selectedArticle.id]?.status || selectedArticle.status) === 'processing' ? 'orange' : (selectedArticle.category ? 'blue' : 'default')} style={{ marginBottom: '10px' }}>
                {(liveUpdates[selectedArticle.id]?.status || selectedArticle.status) === 'processing' ? 'Génération IA active' : (selectedArticle.category?.name || 'Général')}
              </Tag>
              <Title level={2} style={{ marginTop: 0 }}>{selectedArticle.title}</Title>
              <span style={{ color: '#8c8c8c' }}><CalendarOutlined style={{ marginRight: '8px' }} />Publié le {new Date(selectedArticle.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
            <div style={{ fontSize: '16px', lineHeight: '1.6' }}>
              <ReactMarkdown>
                {/* 🚀 Met à jour également la liseuse en direct si l'utilisateur l'ouvre pendant l'écriture */}
                {liveUpdates[selectedArticle.id]?.content ?? selectedArticle.content}
              </ReactMarkdown>
            </div>
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