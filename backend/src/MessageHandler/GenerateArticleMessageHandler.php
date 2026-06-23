<?php

namespace App\MessageHandler;

use App\Dto\OllamaArticleDto;
use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
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
    #[Autowire(service: 'monolog.logger.ai_generator')]
    private LoggerInterface $logger;
    public function __construct(
        EntityManagerInterface $entityManager,
        LoggerInterface $logger,
        PlatformInterface $platform
    ) {
        $this->entityManager = $entityManager;
        $this->logger = $logger;
        $this->platform = $platform;
    }

    public function __invoke(GenerateArticleMessage $message): void
    {
        $this->logger->info('Début de génération pour le sujet dans ai_generator.log: {topic}', ['topic' => $message->getTopic()]);

        try {
            $article = $this->entityManager->getRepository(Article::class)->find($message->getArticleId());
            if (!$article) return;

            $messages = new MessageBag();

            // 2. Ajouter les messages un par un
            // Note : SystemMessage attend un string, UserMessage attend un Text
            $messages->add(new SystemMessage("Tu es un rédacteur web expert. Ton: {$message->getTone()}."));
            $messages->add(new UserMessage(new Text("Rédige un article sur : {$message->getTopic()}")));

            // Appel à la plateforme
            $result = $this->platform->invoke('llama3.2', $messages);
            $this->logger->debug('Appel IA réussi, traitement du résultat...');

            $content = $result->getResult()->getContent();
        
            // Si c'est un objet, le cast (string) appelle sa méthode __toString()
            $article->setContent((string) $content);
            
            $this->entityManager->flush();
           } catch (\Exception $e) {
            // Log critique avec le contexte complet
            $this->logger->error('Échec de la génération IA', [
                'topic' => $message->getTopic(),
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Relancer l'exception pour que Messenger s'en occupe
            throw $e;
        }
    }
}