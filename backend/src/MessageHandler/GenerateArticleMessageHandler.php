<?php

namespace App\MessageHandler;

use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\AI\Platform\Message\Content\Text;
use Symfony\AI\Platform\Message\MessageBag;
use Symfony\AI\Platform\Message\SystemMessage;
use Symfony\AI\Platform\Message\UserMessage;
use Symfony\AI\Platform\PlatformInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Workflow\WorkflowInterface;

#[AsMessageHandler]
class GenerateArticleMessageHandler
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,

        #[Autowire(service: 'monolog.logger.ai_generator')]
        private readonly LoggerInterface $logger,

        private readonly PlatformInterface $platform,

        #[Target('article_generation')]
        private readonly WorkflowInterface $articleGenerationWorkflow,
    ) {
    }

    private function getLengthInstruction(?string $length): string
    {
        return match ($length) {
            'court' => 'environ 200 mots',
            'long' => '1000 mots ou plus',
            default => 'environ 500 mots', // 'moyen' ou valeur inconnue
        };
    }

    public function __invoke(GenerateArticleMessage $message): void
    {
        $article = $this->entityManager->getRepository(Article::class)->find($message->getArticleId());
        if (!$article) {
            $this->logger->error("Article introuvable pour l'ID {id}", ['id' => $message->getArticleId()]);

            return;
        }

        // 1. Passage à l'état "processing" (L'IA commence le travail)
        if ($this->articleGenerationWorkflow->can($article, 'start_processing')) {
            $this->articleGenerationWorkflow->apply($article, 'start_processing');
            $this->entityManager->flush();
            $this->logger->info("Article {id} : transition vers 'processing'", ['id' => $article->getId()]);
        }

        try {
            $messages = new MessageBag();

            // 2. Ajouter les messages un par un
            // Note : SystemMessage attend un string, UserMessage attend un Text
            $messages->add(new SystemMessage("Tu es un rédacteur web expert. Ton: {$message->getTone()}."));
            $lengthInstruction = $this->getLengthInstruction($message->getLength());
            $messages->add(new UserMessage(new Text(
                "Rédige un article de {$lengthInstruction} sur : {$message->getTopic()}"
            )));

            // Appel à la plateforme
            $result = $this->platform->invoke('llama3.2', $messages);
            $this->logger->debug('Appel IA réussi, traitement du résultat...');

            $content = $result->getResult()->getContent();

            // Si c'est un objet, le cast (string) appelle sa méthode __toString()
            $article->setContent((string) $content);

            if ($this->articleGenerationWorkflow->can($article, 'mark_success')) {
                $this->articleGenerationWorkflow->apply($article, 'mark_success');
                $this->entityManager->flush();
                $this->logger->info("Article {id} : génération réussie ('success')", ['id' => $article->getId()]);
            }
        } catch (\Exception $e) {
            // Log critique avec le contexte complet
            if ($this->articleGenerationWorkflow->can($article, 'mark_failed')) {
                $this->articleGenerationWorkflow->apply($article, 'mark_failed');
                $this->entityManager->flush();
            }

            $this->logger->error("Échec de la génération pour l'article {id}. Erreur : {msg}", [
                'id' => $article->getId(),
                'msg' => $e->getMessage(),
            ]);

            // Crucial : on relance l'exception pour que Symfony Messenger place le message dans la queue 'failed'
            throw $e;
        }
    }
}
