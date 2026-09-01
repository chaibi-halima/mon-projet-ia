<?php

// src/MessageHandler/PublishScheduledArticlesMessageHandler.php

namespace App\MessageHandler;

use App\Entity\Article;
use App\Message\PublishScheduledArticlesMessage;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Workflow\WorkflowInterface;

#[AsMessageHandler]
class PublishScheduledArticlesMessageHandler
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,

        #[Autowire(service: 'monolog.logger.ai_generator')]
        private readonly LoggerInterface $logger,

        #[Target('article_generation')]
        private readonly WorkflowInterface $articleGenerationWorkflow,
    ) {
    }

    public function __invoke(PublishScheduledArticlesMessage $_message): void
    {
        $now = new \DateTimeImmutable();

        $dueArticles = $this->entityManager->getRepository(Article::class)
            ->createQueryBuilder('a')
            ->where('a.status = :status')
            ->andWhere('a.scheduledAt <= :now')
            ->setParameter('status', 'scheduled')
            ->setParameter('now', $now)
            ->getQuery()
            ->getResult();

        if (empty($dueArticles)) {
            return; // rien à publier, silencieux — évite de spammer les logs toutes les minutes
        }

        foreach ($dueArticles as $article) {
            if ($this->articleGenerationWorkflow->can($article, 'publish_scheduled')) {
                $this->articleGenerationWorkflow->apply($article, 'publish_scheduled');
                $this->logger->info('Article {id} : publication programmée déclenchée', ['id' => $article->getId()]);
            }
        }

        $this->entityManager->flush();
    }
}
