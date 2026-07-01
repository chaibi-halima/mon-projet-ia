<?php

namespace App\MessageHandler;

use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Workflow\WorkflowInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

#[AsMessageHandler]
class GenerateArticleMessageHandler
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,

        #[Autowire(service: 'monolog.logger.ai_generator')]
        private readonly LoggerInterface $logger,

        #[Autowire(service: 'http_client')]
        private readonly HttpClientInterface $httpClient, // 🚀 Injecté pour gérer le stream direct

        #[Target('article_generation')]
        private readonly WorkflowInterface $articleGenerationWorkflow,

        private readonly HubInterface $hub, // 🚀 Injecté pour notifier React
    ) {}

    public function __invoke(GenerateArticleMessage $message): void
    {
        $article = $this->entityManager->getRepository(Article::class)->find($message->getArticleId());
        if (!$article) {
            $this->logger->error("Article introuvable pour l'ID {id}", ['id' => $message->getArticleId()]);

            return;
        }

        // 1. Passage à l'état "processing"
        if ($this->articleGenerationWorkflow->can($article, 'start_processing')) {
            $this->articleGenerationWorkflow->apply($article, 'start_processing');
            $this->entityManager->flush();
            $this->logger->info("Article {id} : transition vers 'processing'", ['id' => $article->getId()]);
        }

        try {
            $this->logger->info("=== 🚀 DÉBUT DE LA GÉNÉRATION POUR L'ARTICLE {$article->getId()} ===");
            $fullContent = '';

            $response = $this->httpClient->request('POST', 'http://ollama:11434/api/chat', [
                'json' => [
                    'model' => 'llama3.2',
                    'messages' => [
                        ['role' => 'system', 'content' => "Tu es un rédacteur web expert. Ton: {$message->getTone()}."],
                        ['role' => 'user', 'content' => "Rédige un article sur : {$message->getTopic()}"],
                    ],
                    'stream' => true,
                ],
            ]);

            $buffer = '';
            $updateCounter = 0;

            // 🔄 Lecture du flux réseau d'Ollama
            foreach ($this->httpClient->stream($response) as $chunk => $chunkResult) {
                if ($chunkResult->isLast()) {
                    break;
                }

                // On accumule les morceaux de texte dans un buffer de lignes
                $buffer .= $chunkResult->getContent();

                // Ollama sépare ses JSON par des retours à la ligne (\n)
                while (($pos = strpos($buffer, "\n")) !== false) {
                    $line = substr($buffer, 0, $pos);
                    $buffer = substr($buffer, $pos + 1);

                    if (empty(trim($line))) {
                        continue;
                    }

                    $data = json_decode($line, true);
                    if (isset($data['message']['content'])) {
                        $text = $data['message']['content'];
                        $fullContent .= $text;
                        $updateCounter++;

                        // ⚡ THROTTLING : On notifie React uniquement tous les 15 morceaux de texte 
                        // pour éviter de saturer les logs et le réseau
                        if ($updateCounter % 15 === 0) {
                            $this->hub->publish(new Update(
                                sprintf('http://mon-projet.com/article/%d', $article->getId()),
                                json_encode([
                                    'content' => $fullContent,
                                    'status' => 'processing'
                                ])
                            ));
                        }
                    }
                }
            }

            $this->logger->info("=== 📝 FIN DU FLUX IA. ENREGISTREMENT EN BDD... ===");

            // Sauvegarde finale du texte complet
            $article->setContent($fullContent);

            // 4. Passage à l'état "success"
            if ($this->articleGenerationWorkflow->can($article, 'mark_success')) {
                $this->articleGenerationWorkflow->apply($article, 'mark_success');
                $this->entityManager->flush(); // ⚠️ Si ça plante ici, regarde le type de ta colonne en BDD !
                $this->logger->info("Article {id} : sauvegardé avec succès en BDD.", ['id' => $article->getId()]);
            }

            // 5. Notification finale de succès pour React
            $this->hub->publish(new Update(
                sprintf('http://mon-projet.com/article/%d', $article->getId()),
                json_encode([
                    'content' => $fullContent,
                    'status' => 'success'
                ])
            ));

            $this->logger->info("=== 🏁 APPLIQUÉ AVEC SUCCÈS POUR L'ARTICLE {$article->getId()} ===");
        } catch (\Exception $e) {
            if ($this->articleGenerationWorkflow->can($article, 'mark_failed')) {
                $this->articleGenerationWorkflow->apply($article, 'mark_failed');
                $this->entityManager->flush();
            }

            $this->logger->error("Échec de la génération pour l'article {id}. Erreur : {msg}", [
                'id' => $article->getId(),
                'msg' => $e->getMessage(),
            ]);

            // Notification de l'échec à React via Mercure
            $this->hub->publish(new Update(
                sprintf('http://mon-projet.com/article/%d', $article->getId()),
                json_encode([
                    'content' => '❌ Une erreur est survenue lors de la génération par l\'IA.',
                    'status' => 'failed'
                ])
            ));

            throw $e;
        }
    }
}
