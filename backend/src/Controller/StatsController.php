<?php

namespace App\Controller;

use App\Repository\ArticleRepository;
use App\Repository\CategoryRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class StatsController extends AbstractController
{
    #[Route('/api/stats', name: 'app_api_stats', methods: ['GET'])]
    public function getStats(ArticleRepository $articleRepo, CategoryRepository $categoryRepo): JsonResponse
    {
        // 1. Nombre total d'articles et de catégories
        $totalArticles = $articleRepo->count([]);
        $totalCategories = $categoryRepo->count([]);

        // 2. Calcul du temps de lecture global (en minutes)
        $articles = $articleRepo->findAll();
        $totalWords = 0;
        foreach ($articles as $article) {
            $totalWords += str_word_count(strip_tags($article->getContent() ?? ''));
        }
        // Évaluation : ~200 mots par minute
        $readingTime = ceil($totalWords / 200);

        // 3. Répartition des articles par catégorie
        $distribution = [];
        foreach ($categoryRepo->findAll() as $category) {
            $count = count($category->getArticles());
            if ($count > 0) {
                $distribution[] = [
                    'name' => $category->getName(),
                    'count' => $count,
                    'percentage' => $totalArticles > 0 ? round(($count / $totalArticles) * 100) : 0,
                ];
            }
        }

        return new JsonResponse([
            'totalArticles' => $totalArticles,
            'totalCategories' => $totalCategories,
            'readingTime' => $readingTime,
            'distribution' => $distribution,
        ]);
    }
}
