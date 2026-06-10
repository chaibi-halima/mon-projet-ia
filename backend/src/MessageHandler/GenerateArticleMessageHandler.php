<?php

namespace App\MessageHandler;

use App\Dto\OllamaArticleDto;
use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

#[AsMessageHandler]
class GenerateArticleMessageHandler
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private HttpClientInterface $httpClient,
        private SerializerInterface $serializer 
    ) {}

    public function __invoke(GenerateArticleMessage $message): void
    {
        $article = $this->entityManager->getRepository(Article::class)->find($message->getArticleId());
        if (!$article) return;

        try {
            // 💡 1. LE PROMPT QUI EXIGE DU JSON AVEC TON ET LONGUEUR
            $prompt = sprintf(
                "Tu es un rédacteur web expert. Rédige un article sur le sujet suivant : '%s'. 
                Directives strictes :
                1. Le ton de l'article doit être : %s.
                2. La longueur de l'article doit être : %s.
                
                Tu DOIS IMPÉRATIVEMENT répondre au format JSON strict avec EXACTEMENT les clés suivantes :
                {
                    \"seo_title\": \"Le titre accrocheur de l'article\",
                    \"content\": \"Le contenu complet formaté en Markdown avec des titres (##), gras et listes\",
                    \"tags\": [\"tag1\", \"tag2\", \"tag3\"]
                }",
                $message->getTopic(), // 👈 Utilisation des getters !
                $message->getTone() ?? 'professionnel',
                $message->getLength() ?? 'moyen'
            );

            // 💡 2. Appel à Ollama (Format JSON forcé)
            $response = $this->httpClient->request('POST', 'http://ollama:11434/api/generate', [
                'json' => [
                    'model' => 'llama3.2',
                    'prompt' => $prompt,
                    'stream' => false,
                    'format' => 'json'
                ],
                'timeout' => 300 
            ]);

            $jsonString = $response->toArray()['response'] ?? '{}';

            // 💡 3. Désérialisation dans le DTO
            /** @var OllamaArticleDto $dto */
            $dto = $this->serializer->deserialize($jsonString, OllamaArticleDto::class, 'json');

            $realContent = is_array($dto->content) 
                ? implode("\n\n", $dto->content) 
                : $dto->content;

            // 💡 4. Mise à jour de l'article
            $article->setTitle($dto->seo_title ?? 'Titre généré');
            
            $tagsArray = is_array($dto->tags) ? $dto->tags : [];
            $formattedContent = $realContent . "\n\n🏷️ Tags : " . implode(', ', $tagsArray);
            
            $article->setContent($formattedContent);

            if (!$article->getImageUrl()) {
                $article->setImageUrl('https://picsum.photos/seed/' . $article->getId() . '/800/400');
            }
        } catch (\Exception $e) {
            $article->setContent('Erreur de génération : ' . $e->getMessage());
        }

        $this->entityManager->flush();
    }
}