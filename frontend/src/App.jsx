import { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Input, Select, Space, Spin, Empty, 
  Tag, Typography, Button, Modal, Popconfirm, Form, message, Pagination 
} from 'antd'; // 💡 Import de Pagination
import { 
  CalendarOutlined, SearchOutlined, SortAscendingOutlined, 
  TagsOutlined, BookOutlined, EditOutlined, DeleteOutlined 
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

const DEFAULT_IMAGE = 'https://placehold.co/800x400/f0f2f5/8c8c8c?text=Image+non+fournie';
const { Title, Paragraph } = Typography;

function App() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États des filtres
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // 💡 NOUVEAUX ÉTATS POUR LA PAGINATION SERVEUR
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [tick, setTick] = useState(0);

  // États des Modales
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  
  const [editForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1); // Fait évoluer le tick de +1 de façon asynchrone (aucun bug de render)
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('https://localhost/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.member || data))
      .catch(err => console.error("Erreur catégories:", err));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    let url = `https://localhost/api/articles?page=${currentPage}`;
    
    if (searchText) url += `&title=${encodeURIComponent(searchText)}`;
    if (selectedCategory && selectedCategory !== 'all') url += `&category.name=${encodeURIComponent(selectedCategory)}`;
    
    const order = sortBy === 'newest' ? 'desc' : 'asc';
    url += `&order[createdAt]=${order}`;

    // 💡 AJOUT DU HEADER AVEC LE TOKEN ICI
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/ld+json'
      }
    })
      .then(res => res.json())
      .then(data => {
        // On met à jour l'état uniquement si on a reçu des membres
        if (data.member) {
          setArticles(data.member);
          setTotalItems(data.totalItems || 0); 
        }
        setLoading(false); 
      })
      .catch(err => {
        console.error("Erreur articles:", err);
        setLoading(false);
      });
  }, [currentPage, searchText, selectedCategory, sortBy, tick]);

  // Suppression
  const handleDelete = (id) => {
    const token = localStorage.getItem('jwt_token');
    fetch(`https://localhost/api/articles/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (res.ok) {
        messageApi.success('Article supprimé !');
        // Si on supprime le dernier article d'une page, on recule d'une page
        if (articles.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          // Sinon on rafraîchit simplement la page actuelle en changeant discrètement un état
          setCurrentPage(currentPage); 
        }
      }
    });
  };

  // Édition
  const openEditModal = (article) => {
    setEditingArticle(article);
    editForm.setFieldsValue({
      title: article.title,
      content: article.content,
      category: article.category ? article.category['@id'] : undefined,
      imageUrl: article.imageUrl
    });
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = (values) => {
    const token = localStorage.getItem('jwt_token');
    fetch(`https://localhost/api/articles/${editingArticle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/ld+json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(values)
    })
    .then(res => res.json())
    .then(updatedArticle => {
      if (updatedArticle['@id']) {
        messageApi.success('Article modifié !');
        setArticles(articles.map(a => a.id === editingArticle.id ? updatedArticle : a));
        setIsEditModalVisible(false);
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

      {/* Barre de recherche */}
      <Card style={{ marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Input
              placeholder="Rechercher par titre..."
              prefix={<SearchOutlined />} value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
                setLoading(true);
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
                    setCurrentPage(1); // 💡 On remet à la page 1 ici !
                    setLoading(true);
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
                    setCurrentPage(1); // 💡 On remet à la page 1 ici !
                    setLoading(true);
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

      {/* Grille d'articles avec Spinner de chargement pendant le fetch serveur */}
      <Spin spinning={loading} tip="Chargement des données...">
        {articles.length === 0 ? (
          <Empty description="Aucun article trouvé." style={{ marginTop: '60px', marginBottom: '60px' }} />
        ) : (
          <>
            <Row gutter={[24, 24]}>
              {articles.map((article) => (
                <Col xs={24} sm={12} lg={8} key={article.id}>
                  <Card
                    hoverable
                    // 💡 NOUVEAU : Affiche l'image en haut de la carte
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

                      <Title level={4} style={{ marginTop: 0, marginBottom: '10px' }}>{article.title}</Title>
                      
                      <Paragraph type="secondary" style={{ marginBottom: '20px' }}>
                        {article.content ? article.content.substring(0, 120) + '...' : ''}
                      </Paragraph>
                    </div>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                      <Space size="middle">
                        <Button type="text" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => openEditModal(article)}>Modifier</Button>
                        <Popconfirm title="Supprimer ?" onConfirm={() => handleDelete(article.id)} okText="Oui" cancelText="Non" okButtonProps={{ danger: true }}>
                          <Button type="text" danger icon={<DeleteOutlined />}>Supprimer</Button>
                        </Popconfirm>
                      </Space>
                      <Button type="primary" size="small" icon={<BookOutlined />} onClick={() => { setSelectedArticle(article); setIsModalVisible(true); }}>Lire</Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 💡 LE COMPOSANT DE PAGINATION APPARAÎT ICI */}
            <div style={{ marginTop: '40px', textAlign: 'center', float: 'right' }}>
              <Pagination 
                current={currentPage} 
                pageSize={6} // Doit être identique à la configuration Symfony
                total={totalItems} 
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false} // On bloque à 6 pour correspondre au serveur
              />
            </div>
          </>
        )}
      </Spin>

      {/* Modales de lecture et d'édition (restent identiques) */}
      <Modal open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} width={800}>
        {selectedArticle && (
          <>
            {/* 💡 NOUVEAU : L'image en grand dans la modale */}
            {selectedArticle && (
              <div style={{ margin: '-24px -24px 20px -24px' }}>
                <img 
                  src={selectedArticle.imageUrl || DEFAULT_IMAGE} 
                  alt="Couverture" 
                  style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} 
                />
              </div>
            )}
            
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
              {categories.map(cat => <Select.Option key={cat.id} value={cat['@id']}>{cat.name}</Select.Option>)}
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