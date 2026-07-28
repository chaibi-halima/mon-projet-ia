<?php

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\GraphQl\DeleteMutation;
use ApiPlatform\Metadata\GraphQl\Mutation;
use ApiPlatform\Metadata\GraphQl\Query;
use ApiPlatform\Metadata\GraphQl\QueryCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\ArticleRepository;
use App\State\ArticleAiProcessor;
use App\State\ArticleRetryProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: ArticleRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Delete(),
        new Put(),
        new Post(name: 'post_manual'),
        new Post(
            uriTemplate: '/articles/generate',
            name: 'post_ai',
            processor: ArticleAiProcessor::class,
            priority: 10, // 👈 Crucial pour doubler la route /{id}
        ),
        new Post(
            uriTemplate: '/articles/{id}/retry',
            name: 'post_retry',
            processor: ArticleRetryProcessor::class,
            deserialize: false, // 👈 pas de body attendu, juste l'ID dans l'URL
        ),
    ],
    graphQlOperations: [
        new QueryCollection(paginationType: 'page'), // ✨ Active le mode page pour la liste !
        new Query(),
        new Mutation(name: 'create'),
        new Mutation(name: 'update'),
        new DeleteMutation(name: 'delete'),
    ],
    mercure: ['private' => false],
    normalizationContext: ['groups' => ['article:read']],
    denormalizationContext: ['groups' => ['article:write']],
    paginationItemsPerPage: 6
)]
#[ApiFilter(SearchFilter::class, properties: ['title' => 'partial', 'category.name' => 'exact', 'status' => 'exact'])]
#[ApiFilter(OrderFilter::class, properties: ['createdAt'])]
class Article
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['article:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['article:read', 'article:write'])]
    private ?string $title = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['article:read', 'article:write'])]
    private ?string $content = null;

    #[ORM\ManyToOne(inversedBy: 'articles')]
    #[Groups(['article:read', 'article:write'])]
    private ?Category $category = null;

    #[ORM\Column]
    #[Groups(['article:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['article:read', 'article:write'])]
    private ?string $tone = 'professionnel';

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['article:read', 'article:write'])]
    private ?string $length = 'moyen';

    #[ORM\Column(length: 1024, nullable: true)]
    #[Groups(['article:read', 'article:write'])]
    private ?string $imageUrl = null;

    #[ORM\Column(length: 255, options: ['default' => 'pending'])]
    #[Groups(['article:read', 'article:write'])]
    private string $status = 'pending'; // État initial obligatoire

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    #[Groups(['article:read', 'article:write'])]
    private ?\DateTimeImmutable $scheduledAt = null;

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

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getTone(): ?string
    {
        return $this->tone;
    }

    public function setTone(?string $tone): static
    {
        $this->tone = $tone;

        return $this;
    }

    public function getLength(): ?string
    {
        return $this->length;
    }

    public function setLength(?string $length): static
    {
        $this->length = $length;

        return $this;
    }

    public function getImageUrl(): ?string
    {
        return $this->imageUrl;
    }

    public function setImageUrl(?string $imageUrl): static
    {
        $this->imageUrl = $imageUrl;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function getScheduledAt(): ?\DateTimeImmutable
    {
        return $this->scheduledAt;
    }

    public function setScheduledAt(?\DateTimeImmutable $scheduledAt): static
    {
        $this->scheduledAt = $scheduledAt;

        return $this;
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        if (null === $this->createdAt) {
            $this->createdAt = new \DateTimeImmutable();
        }
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        if (null === $this->createdAt) {
            $this->createdAt = new \DateTimeImmutable();
        }
    }
}
