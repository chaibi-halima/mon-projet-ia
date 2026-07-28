<?php

namespace App\MessageHandler;

use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use App\Service\UnsplashImageProvider;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Workflow\WorkflowInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface; // 🚀 Pour streamer les tokens en direct

#[AsMessageHandler]
class GenerateArticleMessageHandler
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,

        #[Autowire(service: 'monolog.logger.ai_generator')]
        private readonly LoggerInterface $logger,

        private readonly UnsplashImageProvider $imageProvider,

        #[Target('article_generation')]
        private readonly WorkflowInterface $articleGenerationWorkflow,

        private readonly HubInterface $hub,
        private readonly HttpClientInterface $httpClient, // 👈 Injection du client HTTP
    ) {
    }

    public function __invoke(GenerateArticleMessage $message): void
    {
        $article = $this->entityManager->getRepository(Article::class)->find($message->getArticleId());
        if (!$article) {
            $this->logger->error("Article introuvable pour l'ID {id}", ['id' => $message->getArticleId()]);

            return;
        }

        $topicUrl = 'http://mon-projet.com/article/'.$article->getId();

        // 1️⃣ Transition Workflow : Démarrage
        if ($this->articleGenerationWorkflow->can($article, 'start_processing')) {
            $this->articleGenerationWorkflow->apply($article, 'start_processing');
            $this->entityManager->flush();
            $this->logger->info("Article {id} : transition vers 'processing'", ['id' => $article->getId()]);

            $this->hub->publish(new Update(
                $topicUrl,
                json_encode([
                    'id' => $article->getId(),
                    'status' => 'processing',
                    'content' => '',
                ]),
                false
            ));
        }

        try {
            $lengthInstruction = $this->getLengthInstruction($message->getLength());

            $this->logger->debug('Démarrage du streaming HTTP Ollama...');

            // 2️⃣ Connexion au flux Ollama avec "stream" => true
            // Ajuste l'URL 'http://ollama:11434' selon le nom de ton conteneur Ollama
            $response = $this->httpClient->request('POST', 'http://ollama:11434/api/chat', [
                'json' => [
                    'model' => 'llama3.2',
                    'messages' => [
                        ['role' => 'system', 'content' => "Tu es un rédacteur web expert. Ton: {$message->getTone()}."],
                        ['role' => 'user', 'content' => "Rédige un article de {$lengthInstruction} sur : {$message->getTopic()}"],
                    ],
                    'stream' => true, // 🚀 Active le mode streaming d'Ollama
                ],
            ]);

            $fullContent = '';

            // 3️⃣ Boucle de streaming : On lit chaque morceau de texte au moment précis où Llama le génère
            foreach ($this->httpClient->stream($response) as $chunk) {
                if ($chunk->isTimeout()) {
                    continue;
                }

                $rawContent = $chunk->getContent();
                $lines = explode("\n", trim($rawContent));

                foreach ($lines as $line) {
                    if (empty($line)) {
                        continue;
                    }

                    $data = json_decode($line, true);

                    // Extraction du mot / de la syllabe générée
                    if (isset($data['message']['content'])) {
                        $textChunk = $data['message']['content'];
                        $fullContent .= $textChunk;

                        // 📡 Publication sur Mercure MOT PAR MOT
                        $this->hub->publish(new Update(
                            $topicUrl,
                            json_encode([
                                'id' => $article->getId(),
                                'status' => 'processing',
                                'chunk' => $textChunk,
                            ]),
                            false
                        ));
                    }
                }
            }

            // Sauvegarde globale du contenu
            $article->setContent($fullContent);

            // 4️⃣ Image Unsplash
            if (!$article->getImageUrl()) {
                $imageUrl = $this->imageProvider->findImageForTopic($message->getTopic());
                if ($imageUrl) {
                    $article->setImageUrl($imageUrl);
                }
            }

            // 5️⃣ Finalisation
            $now = new \DateTimeImmutable();
            if ($article->getScheduledAt() && $article->getScheduledAt() > $now) {
                if ($this->articleGenerationWorkflow->can($article, 'schedule')) {
                    $this->articleGenerationWorkflow->apply($article, 'schedule');
                    $this->entityManager->flush();

                    $this->hub->publish(new Update(
                        $topicUrl,
                        json_encode([
                            'id' => $article->getId(),
                            'status' => 'scheduled',
                            'imageUrl' => $article->getImageUrl(),
                        ]),
                        false
                    ));
                }
            } elseif ($this->articleGenerationWorkflow->can($article, 'mark_success')) {
                $this->articleGenerationWorkflow->apply($article, 'mark_success');
                $this->entityManager->flush();

                $this->hub->publish(new Update(
                    $topicUrl,
                    json_encode([
                        'id' => $article->getId(),
                        'status' => 'success',
                        'imageUrl' => $article->getImageUrl(),
                    ]),
                    false
                ));
            }
        } catch (\Exception $e) {
            if ($this->articleGenerationWorkflow->can($article, 'mark_failed')) {
                $this->articleGenerationWorkflow->apply($article, 'mark_failed');
                $this->entityManager->flush();
            }

            $this->hub->publish(new Update(
                $topicUrl,
                json_encode([
                    'id' => $article->getId(),
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ]),
                false
            ));

            throw $e;
        }
    }

    private function getLengthInstruction(?string $length): string
    {
        return match ($length) {
            'court' => 'environ 200 mots',
            'long' => '1000 mots ou plus',
            default => 'environ 500 mots',
        };
    }
}
