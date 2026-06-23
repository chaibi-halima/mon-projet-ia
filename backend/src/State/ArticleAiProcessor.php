<?php

namespace App\State;

use ApiPlatform\Doctrine\Common\State\PersistProcessor;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use Symfony\Component\Messenger\MessageBusInterface;

/**
 * @implements ProcessorInterface<Article, Article>
 */
class ArticleAiProcessor implements ProcessorInterface
{
    public function __construct(
        private PersistProcessor $persistProcessor,
        private MessageBusInterface $messageBus, // 💡 On injecte le bus de messages
    ) {}

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
