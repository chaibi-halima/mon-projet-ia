<?php

namespace App\Command;

use App\Entity\Article;
use App\Message\GenerateArticleMessage;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Messenger\MessageBusInterface;

#[AsCommand(
    name: 'app:mass-generate',
    description: 'Génère des articles en masse de manière asynchrone.'
)]
class MassGenerateArticleCommand extends Command
{
    // 💡 1. Les services (BDD, Bus) s'injectent TOUJOURS dans le constructeur
    public function __construct(
        private EntityManagerInterface $entityManager,
        private MessageBusInterface $messageBus,
    ) {
        parent::__construct();
    }

    // 💡 2. Configuration des arguments tapés dans le terminal
    protected function configure(): void
    {
        $this
            ->addArgument('subject', InputArgument::REQUIRED, 'Le sujet principal de tes articles')
            ->addArgument('count', InputArgument::OPTIONAL, "Le nombre d'articles à générer", 5);
    }

    // 💡 3. L'exécution de la commande
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $subject = $input->getArgument('subject');
        $count = (int) $input->getArgument('count');

        $output->writeln("<info>🚀 Lancement de la génération de $count articles sur '$subject'...</info>");

        $articlesEnAttente = [];

        // Création des articles en base de données
        for ($i = 1; $i <= $count; ++$i) {
            $article = new Article();
            $titre = sprintf('%s - Idée n°%d', $subject, $i);

            $article->setTitle($titre);
            $article->setContent('⏳ En attente de rédaction par l\'IA (CLI)...');

            $this->entityManager->persist($article);
            $articlesEnAttente[] = $article;
        }

        $this->entityManager->flush();

        // Envoi des tickets au Worker
        foreach ($articlesEnAttente as $article) {
            $this->messageBus->dispatch(new GenerateArticleMessage($article->getId(), $article->getTitle()));
            $output->writeln("Ticket envoyé pour l'article ID : ".$article->getId());
        }

        $output->writeln('<info>✅ Terminé ! Le Worker prend le relais en tâche de fond.</info>');

        return Command::SUCCESS;
    }
}
