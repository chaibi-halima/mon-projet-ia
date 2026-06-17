## 🚀 AI Content Generator : Architecture Asynchrone Full-Stack

> **Un projet de niveau professionnel démontrant l'intégration d'une intelligence artificielle locale au sein d'une architecture moderne, découplée et dotée d'une interface utilisateur d'entreprise (Enterprise UI).**

Ce projet est une application web complète permettant de générer des articles de blog ou du contenu SEO de manière automatisée grâce à une intelligence artificielle (LLM) hébergée localement. Il met en lumière une architecture robuste capable de gérer des tâches lourdes en arrière-plan sans bloquer l'expérience utilisateur, le tout piloté par une interface moderne et soignée.

## 🛠️ Stack Technique & Architecture

L'application repose sur une architecture découplée séparant clairement le client, le serveur et les travailleurs (workers).

* **Frontend :** React (Vite) couplé à **Ant Design (Antd)** et **Apollo Client** (GraphQL).
* **Backend :** Symfony 8, FrankenPHP, et **Symfony AI Platform** pour l'intégration LLM.
* **Base de données :** MySQL.
* **Intelligence Artificielle :** Ollama (LLM Llama 3.2) fonctionnant en local.
* **Système asynchrone :** Symfony Messenger avec Workers dédiés.

---

## ✨ Fonctionnalités & Expérience Utilisateur (UI/UX)

L'application a été entièrement conçue pour offrir un confort d'utilisation optimal :

* **Navigation Multi-page Fluide :** Menu global pour la Bibliothèque, Rédaction Manuelle, et laboratoire de Génération IA.
* **Composants intelligents :**
    * Système de troncature de texte avec boutons interactifs *"Voir plus / Voir moins"*.
    * Info-bulles (Tooltips) contextuelles pour les titres longs.
    * Notifications natives via Ant Design.

---

## ⚙️ Prérequis

* [Docker](https://www.docker.com/) et Docker Compose.
* [Ollama](https://ollama.com/) avec le modèle Llama 3.2 (`ollama run llama3.2`).
* [Node.js](https://nodejs.org/).

---

## 🚀 Installation & Démarrage

**1. Cloner le dépôt**
```bash
git clone [https://github.com/chaibi-halima/mon-projet-ia.git](https://github.com/chaibi-halima/mon-projet-ia.git)
cd mon-projet-ia
```

**2. Lancer l'infrastructure (Backend, BDD, Serveur Web)**
```bash
docker compose up -d
```

**3. Démarrer le Worker (Traitement asynchrone en tâche de fond)**
Ouvrez un nouveau terminal et lancez le consommateur de messages :
```bash
docker compose exec webgateway php bin/console messenger:consume async -vv
```

**4. Lancer le Frontend (React + Ant Design)**
Ouvrez un autre terminal dans le dossier frontend :
```bash
cd frontend
npm install
npm run dev
```

L'application est maintenant accessible sur `http://localhost:3000`.

---

## 💻 Utilisation (Mode CLI)

En plus de l'interface web, le projet inclut une commande console puissante pour alimenter la base de données en masse.

Pour générer 5 articles sur un sujet spécifique via le terminal :
```bash
docker compose exec webgateway php bin/console app:mass-generate "L'exploration spatiale" 5
```

---

## 🧠 Apprentissages & Défis Techniques

Ce projet a permis de résoudre des problématiques d'architecture et d'intégration avancées :

* **Intégration IA moderne :** Mise en œuvre de ai-platform avec injection de dépendances, gestion des MessageBag et des DeferredResult pour une communication asynchrone avec Ollama.
* **Migration vers un Design System :** Transition vers une bibliothèque de composants d'entreprise (Ant Design), améliorant la maintenabilité et la vitesse de développement.
* **Optimisation des performances d'affichage (CLS) :** Résolution des sauts de mise en page (*Cumulative Layout Shift*) lors du chargement instantané de la PWA grâce au blocage strict des dimensions du conteneur de navigation (`flexShrink`, `whiteSpace`).
* **Modularité React :** Isolation de la logique d'affichage des articles dans un sous-composant autonome (`ArticleCard`) pour garantir la gestion indépendante des états locaux (boutons *Voir plus*).
* **Fiabilisation des flux de données :** Implémentation de structures de sécurité (*garde-fous*) multi-formats dans l'analyse des réponses d'API (adaptation dynamique aux clés `member`, `hydra:member` et tableaux bruts).