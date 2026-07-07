import { useMutation, useQuery, useApolloClient } from '@apollo/client/react'; // 💡 Ajout d'Apollo
import { useNavigate } from 'react-router-dom'; // 💡 Pour la redirection
import { Form, Input, Button, Select, Card, Typography, message } from 'antd';
import { CREATE_ARTICLE, GET_CATEGORIES } from './graphql/articleQueries';

const { Title } = Typography;

function ManualForm() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const client = useApolloClient();
  const [messageApi, contextHolder] = message.useMessage();

  // 1. Charger les vraies catégories pour le menu déroulant
  const { data: categoriesData, refetch: refetchCategories } = useQuery(GET_CATEGORIES);
  const categories = categoriesData?.categories?.collection || [];

  // 2. Déclarer la mutation de création
  const [createArticle, { loading }] = useMutation(CREATE_ARTICLE, {
    onCompleted: () => {
      messageApi.success('Article créé avec succès !');
      form.resetFields();
      client.cache.evict({ fieldName: 'articles' });
      client.cache.gc(); 
      navigate('/'); // 🚀 Redirection vers la bibliothèque
      refetchCategories();
    },
    onError: (err) => {
      messageApi.error(`Erreur lors de la création : ${err.message}`);
    }
  });

  const onFinish = (values) => {
    createArticle({
      variables: {
        title: values.title,
        content: values.content,
        category: values.category || null, // IRI ou ID de la catégorie
        imageUrl: values.imageUrl || null,
        status: 'success' // On peut définir un statut par défaut si nécessaire
      }
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {contextHolder}
      <Card style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <Title level={3} style={{ marginBottom: '24px' }}>✍️ Rédaction Manuelle</Title>
        
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="Titre de l'article" rules={[{ required: true, message: 'Le titre est obligatoire' }]}>
            <Input placeholder="Entrez le titre..." size="large" />
          </Form.Item>

          <Form.Item name="category" label="Catégorie">
            <Select placeholder="Sélectionnez une catégorie" size="large">
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="content" label="Contenu de l'article" rules={[{ required: true, message: 'Le contenu est obligatoire' }]}>
            <Input.TextArea rows={10} placeholder="Écrivez votre article ici (Markdown supporté)..." />
          </Form.Item>

          <Form.Item name="imageUrl" label="URL de l'image de couverture">
            <Input placeholder="https://images.unsplash.com/..." size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button type="primary" htmlType="submit" size="large" loading={loading}>
              Publier l'article
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ManualForm;