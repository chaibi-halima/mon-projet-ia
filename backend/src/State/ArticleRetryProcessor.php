<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Workflow\WorkflowInterface;

/**
 * @implements ProcessorInterface<Article, Article>
 */
class ArticleRetryProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private MessageBusInterface $messageBus,

        #[Target('article_generation')]
        private WorkflowInterface $articleGenerationWorkflow,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if (!$data instanceof Article) {
            return $data;
        }

        // Sécurité : on ne relance que si le workflow l'autorise (donc depuis 'failed')
        if (!$this->articleGenerationWorkflow->can($data, 'return_processing')) {
            throw new \RuntimeException(sprintf("L'article %d ne peut pas être relancé depuis son état actuel ('%s').", $data->getId(), $data->getStatus()));
        }

        $this->articleGenerationWorkflow->apply($data, 'return_processing');
        $data->setContent('⏳ En cours de rédaction par l\'IA...');

        $savedArticle = $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        // On relance avec les MÊMES paramètres que la génération d'origine
        $this->messageBus->dispatch(new GenerateArticleMessage(
            $savedArticle->getId(),
            $savedArticle->getTitle(),
            $savedArticle->getTone() ?? 'professionnel',
            $savedArticle->getLength() ?? 'moyen'
        ));

        return $savedArticle;
    }
}
