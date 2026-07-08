<?php

// src/Service/UnsplashImageProvider.php

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class UnsplashImageProvider
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly LoggerInterface $logger,

        #[Autowire(env: 'UNSPLASH_ACCESS_KEY')]
        private readonly string $accessKey,
    ) {
    }

    /**
     * Cherche une image pertinente sur Unsplash pour un sujet donné.
     * Retourne null en cas d'échec (réseau, quota dépassé, aucun résultat) — ne lève jamais d'exception,
     * pour ne jamais faire échouer la génération de l'article à cause de l'image.
     */
    public function findImageForTopic(string $topic): ?string
    {
        try {
            $response = $this->httpClient->request('GET', 'https://api.unsplash.com/search/photos', [
                'query' => [
                    'query' => $topic,
                    'per_page' => 1,
                    'orientation' => 'landscape',
                ],
                'headers' => [
                    'Authorization' => 'Client-ID '.$this->accessKey,
                ],
                'timeout' => 5, // on ne veut pas bloquer la génération de l'article trop longtemps
            ]);

            $data = $response->toArray(false);

            $imageUrl = $data['results'][0]['urls']['regular'] ?? null;

            if (!$imageUrl) {
                $this->logger->info('Unsplash : aucune image trouvée pour "{topic}"', ['topic' => $topic]);
            }

            return $imageUrl;
        } catch (\Throwable $e) {
            $this->logger->warning('Unsplash : échec de la recherche d\'image pour "{topic}" — {msg}', [
                'topic' => $topic,
                'msg' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
