<?php

namespace App\Entity;

use App\Repository\ArticleRepository;
use ApiPlatform\Metadata\ApiResource;
use Doctrine\ORM\Mapping as ORM;
use App\State\ArticleAiProcessor;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Put;

#[ORM\Entity(repositoryClass: ArticleRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Delete(),
        new Put(),
        // 1️⃣ ROUTE MANUELLE : /api/articles
        new Post(name: 'post_manual'), 

        // 2️⃣ ROUTE IA : /api/articles/generate
        new Post(
            name: 'post_ai',
            uriTemplate: '/articles/generate', // 💡 C'est "uriTemplate" qu'il faut écrire ici !
            processor: ArticleAiProcessor::class
        )
    ]
)]
class Article
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $content = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(string $content): static
    {
        $this->content = $content;

        return $this;
    }
}
