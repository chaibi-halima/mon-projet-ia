<?php

namespace App\MessageHandler;

use App\Dto\OllamaArticleDto;
use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\AI\Platform\PlatformInterface; 
use Symfony\AI\Platform\Message\SystemMessage;
use Symfony\AI\Platform\Message\UserMessage;
use Symfony\AI\Platform\Message\MessageBag;
use Symfony\AI\Platform\Message\Content\Text;

#[AsMessageHandler]
class GenerateArticleMessageHandler
{
    private PlatformInterface $platform;
    private EntityManagerInterface $entityManager;

    public function __construct(
        EntityManagerInterface $entityManager,
        PlatformInterface $platform
    ) {
        $this->entityManager = $entityManager;
        $this->platform = $platform;
    }

    public function __invoke(GenerateArticleMessage $message): void
    {
        $article = $this->entityManager->getRepository(Article::class)->find($message->getArticleId());
        if (!$article) return;

        $messages = new MessageBag();

        // 2. Ajouter les messages un par un
        // Note : SystemMessage attend un string, UserMessage attend un Text
        $messages->add(new SystemMessage("Tu es un rédacteur web expert. Ton: {$message->getTone()}."));
        $messages->add(new UserMessage(new Text("Rédige un article sur : {$message->getTopic()}")));

        // Appel à la plateforme
        $result = $this->platform->invoke('llama3.2', $messages);

        $content = $result->getResult()->getContent();
    
        // Si c'est un objet, le cast (string) appelle sa méthode __toString()
        $article->setContent((string) $content);
        
        $this->entityManager->flush();
    }
}