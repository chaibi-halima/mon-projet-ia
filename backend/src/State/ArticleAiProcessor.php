<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use Symfony\Component\DependencyInjection\Attribute\Autowire; // 🚀 1. On change l'import ici
use Symfony\Component\Messenger\MessageBusInterface;

/**
 * @implements ProcessorInterface<Article, Article>
 */
class ArticleAiProcessor implements ProcessorInterface
{
    public function __construct(
        // 🚀 2. On pointe directement sur le service ID exact d'API Platform Doctrine ORM
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private MessageBusInterface $messageBus,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if (!$data instanceof Article) {
            return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
        }

        // 1. On met un texte d'attente pour que l'utilisateur sache que l'IA travaille
        $data->setContent('⏳ En cours de rédaction par l\'IA...');

        // 2. On sauvegarde en BDD (ce qui va lui générer un ID)
        $savedArticle = $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        // 3. On envoie le ticket dans le bus de messages avec l'ID tout frais
        $this->messageBus->dispatch(new GenerateArticleMessage($savedArticle->getId(), $data->getTitle(), $data->getTone(), $data->getLength()));

        // 4. On retourne la réponse instantanément à React !
        return $savedArticle;
    }
}
