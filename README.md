# 🚀 AI Content Generator : Architecture Asynchrone Full-Stack

> **Un projet de niveau professionnel démontrant l'intégration d'une intelligence artificielle locale au sein d'une architecture moderne, asynchrone et découplée.**

Ce projet est une application web complète permettant de générer des articles de blog ou du contenu SEO de manière automatisée grâce à une intelligence artificielle (LLM) hébergée localement. Il met en lumière une architecture robuste capable de gérer des tâches lourdes en arrière-plan sans bloquer l'expérience utilisateur.

---

## 🛠️ Stack Technique & Architecture

L'application repose sur une architecture moderne séparant clairement le client, le serveur et les travailleurs (workers).

* **Frontend :** React (via Vite) configuré en PWA (Progressive Web App) pour une expérience fluide et rapide.
* **Backend :** API RESTful construite avec Symfony 8 et propulsée par FrankenPHP pour des performances optimales.
* **Base de données :** MySQL (Conteneurisée et gérable directement via VS Code / SQLTools).
* **Intelligence Artificielle :** Ollama (LLM Llama 3.2) fonctionnant en local, configuré pour renvoyer des données structurées (JSON).
* **Système asynchrone :** Symfony Messenger. Les requêtes générées par les utilisateurs ou le terminal sont placées dans une file d'attente et traitées par des *Workers* en tâche de fond.

---

## ✨ Fonctionnalités Principales

* **Génération d'articles par IA :** Requêtes adressées à un modèle LLM local pour créer des titres SEO, du contenu et des mots-clés de manière autonome.
* **Traitement Asynchrone (CQRS) :** L'interface utilisateur n'est jamais bloquée. L'API délègue la génération à un *Message Bus*.
* **Double Interface de Commande :** * **Mode Web :** Déclenchement de la génération via l'interface React.
    * **Mode CLI :** Commandes console Symfony personnalisées (`app:mass-generate`) pour générer des dizaines d'articles en masse directement depuis le terminal.
* **Typage Strict (DTO) :** L'IA est contrainte de répondre dans un format JSON strict, mappé automatiquement sur des objets PHP (DTO) via le composant Serializer.

---

## ⚙️ Prérequis

Pour faire tourner ce projet sur votre machine, vous aurez besoin de :

* [Docker](https://www.docker.com/) et Docker Compose.
* [Ollama](https://ollama.com/) installé localement avec le modèle Llama 3.2 téléchargé (`ollama run llama3.2`).
* [Node.js](https://nodejs.org/) (pour le développement frontend).

---

## 🚀 Installation & Démarrage

**1. Cloner le dépôt**
```bash
git clone [https://github.com/chaibi-halima/mon-projet-ia.git](https://github.com/chaibi-halima/mon-projet-ia.git)
cd mon-projet-ia

**2. Lancer infrastructure (Backend, BDD, Serveur Web)**
```bash
docker compose up -d

**3. Démarrer le Worker (Traitement asynchrone en tâche de fond)**
Ouvrez un nouveau terminal et lancez le consommateur de messages :
```bash
docker compose exec webgateway php bin/console messenger:consume async -vv

**4. Lancer le Frontend (React)**
```bash
cd frontend
npm install
npm run dev

L'application est maintenant accessible sur http://localhost:3000

💻 Utilisation (Mode CLI)
En plus de l'interface web, le projet inclut une commande console puissante pour alimenter la base de données en masse.

Pour générer 5 articles sur un sujet spécifique via le terminal :
```bash
docker compose exec webgateway php bin/console app:mass-generate "L'exploration spatiale" 5

Les tickets seront envoyés dans la file d'attente et le Worker (s'il est lancé) commencera immédiatement la rédaction de manière invisible.


🧠 Apprentissages & Défis Techniques
Ce projet a été l'occasion d'implémenter et de résoudre des problématiques d'architecture avancées :

Orchestration Docker : Faire communiquer un front Vite, une API FrankenPHP, une base MySQL et un moteur IA externe dans un réseau sécurisé.

Fiabilisation de l'IA : Forcer un LLM à produire du JSON valide et utiliser des DTO assouplis (string|array) pour prévenir les crashs liés aux hallucinations du modèle.

Gestion des CORS et du Cache : Résolution des blocages de sécurité navigateurs (Preflight OPTIONS) et maîtrise du Service Worker de la PWA.