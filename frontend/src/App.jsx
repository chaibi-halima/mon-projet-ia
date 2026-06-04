import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function App() {
  const [articles, setArticles] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Fonction pour charger la liste
  const loadArticles = () => {
    fetch('https://localhost/api/articles')
      .then(res => res.json())
      .then(data => setArticles(data.member || []));
  };

  useEffect(() => {
    // 1. On charge les articles au démarrage
    loadArticles();

    // 2. On configure le Polling (mise à jour toutes les 5 secondes)
    const interval = setInterval(() => {
      loadArticles();
    }, 5000);

    // 3. On nettoie le chronomètre si le composant est démonté
    return () => clearInterval(interval);
  }, []);

  // 2. Fonction pour envoyer le titre et déclencher l'IA
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Côté React - Formulaire IA
      const response =
        await fetch('https://localhost/api/articles/generate', { // 💡 Note le /generate
          method: 'POST',
          headers: { 'Content-Type': 'application/ld+json' },
          body: JSON.stringify({ title: newTitle }) // L'IA s'occupe du reste
        });

      // 1. Si le serveur renvoie une erreur (4xx ou 5xx)
      if (!response.ok) {
        let errorMessage = "Une erreur est survenue lors de la génération.";
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.title || errorMessage;
        } catch {
          errorMessage = `Erreur Serveur (Statut: ${response.status})`;
        }

        alert(`Erreur API : ${errorMessage}`);
        setLoading(false);
        return;
      }

      // 2. Si tout s'est bien passé
      setNewTitle('');
      setLoading(false);
      loadArticles();

    } catch (error) { // 💡 On s'assure d'écrire explicitement "catch (error)" ici
      console.error("Détails du crash réseau :", error);
      alert("Impossible de joindre le serveur. Vérifie que tes conteneurs Docker tournent.");
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>
      {/* 💡 BOUTON DE NAVIGATION PWA */}
       <div style={{ textAlign: 'right', marginBottom: '20px' }}>
         <Link to="/manuel" style={{ padding: '10px', background: '#007bff', color: '#white', textDecoration: 'none', borderRadius: '5px' }}>
           ✍️ Écrire un article manuellement
         </Link>
       </div>
      <h1>Générateur d'Articles par l'IA 🤖</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <input 
          type="text" 
          value={newTitle} 
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Ex: Les avantages de Docker..." 
          style={{ padding: '10px', width: '300px', marginRight: '10px' }}
          required
        />
        <button type="submit" disabled={loading} style={{ padding: '10px' }}>
          {loading ? 'L\'IA rédige...' : 'Créer avec l\'IA'}
        </button>
      </form>

      <h2>Articles rédigés :</h2>
      {articles.map(article => (
        <div key={article.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
          <h3>{article.title}</h3>
          <p style={{ color: '#555', fontStyle: 'italic' }}>{article.content}</p>
        </div>
      ))}
    </div>
  );
}

export default App;