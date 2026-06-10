import { useContext, useState, useEffect } from 'react';
import { Form, Input, Button, Select, message } from 'antd';
import { AuthContext } from './AuthContext.js';

function ManualForm() {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = useContext(AuthContext); // 💡 Récupération du jeton JWT
  const [messageApi, contextHolder] = message.useMessage();

  // 1. Au chargement du composant, on récupère les catégories depuis l'API
  useEffect(() => {
    fetch('https://localhost/api/categories')
      .then(res => res.json())
      .then(data => {
        const cats = data.member || data;
        setCategories(cats);
        
        // 💡 Astuce : On trouve l'ID de la catégorie "Général" pour la mettre par défaut
        const generalCat = cats.find(c => c.name === 'Général');
        if (generalCat) {
          form.setFieldsValue({ category: `/api/categories/${generalCat.id}` });
        }
      });
  }, [form]);

  // 2. Fonction d'envoi du formulaire
  const onFinish = (values) => {
    setLoading(true);

    // API Platform attend un IRI (le chemin d'API) pour les relations
    const articleData = {
      title: values.title,
      content: values.content,
      // value.category contient déjà la chaîne "/api/categories/X" grâce au composant Select
      category: values.category 
    };

    fetch('https://localhost/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ld+json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(articleData)
    })
    .then(res => {
      if(res.ok) {
        messageApi.success('Article créé avec succès !');
        form.resetFields();
      } else {
        messageApi.error('Erreur lors de la création.')
      }
    })
    .finally(() => setLoading(false));
  };

  return (
    <>
    {contextHolder}
    <Form form={form} onFinish={onFinish} layout="vertical">
      <Form.Item name="title" label="Titre" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      {/* 💡 LE MENU DÉROULANT DES CATÉGORIES */}
      <Form.Item name="category" label="Catégorie">
        <Select placeholder="Sélectionnez une catégorie (Défaut : Général)">
          {categories.map(cat => (
            // Dans API Platform, pour lier une entité, on passe son URI (ex: /api/categories/1)
            <Select.Option key={cat.id} value={`/api/categories/${cat.id}`}>
              {cat.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="content" label="Contenu" rules={[{ required: true }]}>
        <Input.TextArea rows={4} />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={loading}>
        Créer l'article
      </Button>
    </Form>
    </>
  );
}

export default ManualForm;