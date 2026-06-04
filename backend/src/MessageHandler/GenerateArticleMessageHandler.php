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
    // 💡 1. On injecte le Serializer dans le constructeur
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
            // 💡 2. Le prompt très précis
            $prompt = sprintf(
                "Rédige un article sur : '%s'. 
                Tu dois répondre UNIQUEMENT avec un objet JSON valide contenant ces 3 clés :
                - 'seo_title' : un titre accrocheur.
                - 'content' : le texte de l'article (3 phrases max).
                - 'tags' : un tableau de 3 mots-clés.", 
                $message->getTitle()
            );

            // 💡 3. L'appel HTTP avec le "format: json"
            $response = $this->httpClient->request('POST', 'http://ollama:11434/api/generate', [
                'json' => [
                    'model' => 'llama3.2',
                    'prompt' => $prompt,
                    'stream' => false,
                    'format' => 'json' // Ollama bloque tout texte qui n'est pas du JSON
                ],
                'timeout' => 300 
            ]);

            // Récupération de la chaîne JSON renvoyée par l'IA
            $jsonString = $response->toArray()['response'] ?? '{}';

            // 💡 4. LA MAGIE DE L'OBJECT MAPPER :
            // Symfony lit le JSON, crée l'objet DTO, et remplit les propriétés automatiquement !
            /** @var OllamaArticleDto $dto */
            $dto = $this->serializer->deserialize($jsonString, OllamaArticleDto::class, 'json');

            // 💡 AJOUT ICI : Si l'IA a envoyé un tableau de phrases, on les fusionne en un seul texte
            $realContent = is_array($dto->content) 
                ? implode(' ', $dto->content) 
                : $dto->content;

            // On met à jour l'entité avec le titre et le contenu nettoyé
            $article->setTitle($dto->seo_title);
            
            $formattedContent = $realContent . "\n\n🏷️ Tags : " . implode(', ', $dto->tags);
            $article->setContent($formattedContent);

        } catch (\Exception $e) {
            $article->setContent('Erreur de génération ou JSON invalide : ' . $e->getMessage());
        }

        $this->entityManager->flush();
    }
}