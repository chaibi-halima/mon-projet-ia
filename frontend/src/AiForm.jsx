import { useState, useEffect } from 'react';
import { Form, Input, Button, Select, message } from 'antd'; // 💡 Import de Select

function AiForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  
  // 💡 1. État pour stocker les catégories
  const [categories, setCategories] = useState([]);

  // 💡 2. Récupérer les catégories au chargement
  useEffect(() => {
    fetch('https://localhost/api/categories')
      .then(res => res.json())
      .then(data => {
        const cats = data.member || data;
        setCategories(cats);
        // Définit "Général" par défaut si trouvé
        const generalCat = cats.find(c => c.name === 'Général');
        if (generalCat) {
          form.setFieldsValue({ category: `/api/categories/${generalCat.id}` });
        }
      });
  }, [form]);

  // Fonction appelée quand on valide le formulaire
  const onFinish = async (values) => {
    setLoading(true);
    const token = localStorage.getItem('jwt_token');

    try {
      messageApi.loading({ content: 'Transmission au Worker en cours...', key: 'ai' });

      // 💡 On prépare les données pour TON processeur Symfony
      const articleData = {
        title: values.topic, 
        // Si ton champ content n'est pas "nullable" en base de données, 
        // on envoie un texte temporaire que le Worker écrasera plus tard.
        content: "Génération de l'article en cours par l'IA...", 
        category: values.category 
      };

      // 🎯 ON APPELLE TA ROUTE PERSONNALISÉE !
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
        messageApi.success({ content: 'Tâche envoyée au Worker avec succès !', key: 'ai', duration: 3 });
        form.resetFields();
      } else {
        // Pour lire la vraie erreur Symfony si ça bloque
        const errorData = await apiResponse.json();
        console.error("Erreur Symfony :", errorData);
        throw new Error(errorData['hydra:description'] || "Erreur côté serveur");
      }

    } catch (error) {
      console.error(error);
      messageApi.error({ content: `Erreur : ${error.message}`, key: 'ai', duration: 5 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Form form={form} onFinish={onFinish} layout="vertical">
        
        <Form.Item name="topic" label="Sujet de l'article" rules={[{ required: true }]}>
          <Input placeholder="Ex: Les bienfaits du thé vert..." />
        </Form.Item>

        {/* 💡 4. Le champ Catégorie visible pour l'utilisateur */}
        <Form.Item name="category" label="Catégorie">
          <Select placeholder="Sélectionnez une catégorie">
            {categories.map(cat => (
              <Select.Option key={cat.id} value={`/api/categories/${cat.id}`}>
                {cat.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Button type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: '#722ed1' }}>
          ✨ Générer avec l'IA
        </Button>
      </Form>
    </>
  );
}

export default AiForm;