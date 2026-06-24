<?php

namespace App\Tests\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use App\State\ArticleAiProcessor;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Messenger\Envelope;
use Symfony\Component\Messenger\MessageBusInterface;

class ArticleAiProcessorTest extends TestCase
{
    public function testProcessDispatchesMessageForArticle(): void
    {
        // 1. 🎭 Création des Doublures (Mocks pour les espions, Stubs pour les figurants)
        $persistProcessorMock = $this->createMock(ProcessorInterface::class); // Mock (on utilise expects)
        $messageBusMock = $this->createMock(MessageBusInterface::class);     // Mock (on utilise expects)

        // 🚀 Correction 1 : Operation est un figurant, on utilise createStub
        $operationStub = $this->createStub(Operation::class);

        // 2. 📝 Préparation des données de test
        $article = new Article();
        $article->setTitle('Les nouveautés de PHP 8.5');
        $article->setTone('professionnel');
        $article->setLength('medium');

        // 🚀 Correction 2 : L'article sauvegardé est un figurant, on utilise createStub
        $savedArticleStub = $this->createStub(Article::class);
        $savedArticleStub->method('getId')->willReturn(42);
        $savedArticleStub->method('getTitle')->willReturn('Les nouveautés de PHP 8.5');
        $savedArticleStub->method('getTone')->willReturn('professionnel');
        $savedArticleStub->method('getLength')->willReturn('medium');

        // 3. 🎯 Configuration des attentes
        $persistProcessorMock->expects($this->once())
            ->method('process')
            ->with($article, $operationStub)
            ->willReturn($savedArticleStub);

        $messageBusMock->expects($this->once())
            ->method('dispatch')
            ->with($this->isInstanceOf(GenerateArticleMessage::class))
            ->willReturn(new Envelope(new \stdClass()));

        // 4. 🚀 Exécution
        $processor = new ArticleAiProcessor($persistProcessorMock, $messageBusMock);
        $result = $processor->process($article, $operationStub);

        // 5. 🧪 Vérifications
        $this->assertSame($savedArticleStub, $result);
        $this->assertStringContainsString('⏳ En cours de rédaction', $article->getContent());
    }
}
