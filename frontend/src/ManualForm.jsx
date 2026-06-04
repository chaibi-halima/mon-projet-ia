import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ManualForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('https://localhost/api/articles', { // 💡 URL classique
        method: 'POST',
        headers: { 'Content-Type': 'application/ld+json' },
        body: JSON.stringify({ title, content })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      // Redirection vers la page d'accueil après succès
      navigate('/');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <Link to="/">⬅️ Retour à l'accueil (Mode IA)</Link>
      
      <h2>Créer un Article Manuellement</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Titre :</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Contenu :</label>
          <textarea 
            rows="6" 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', cursor: 'pointer' }}>
          {loading ? 'Sauvegarde...' : 'Publier sans IA'}
        </button>
      </form>
    </div>
  );
}