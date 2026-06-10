<?php

namespace App\Message;

class GenerateArticleMessage
{
    public function __construct(
        private int $articleId,
        private string $topic,
        public ?string $tone = 'professionnel',
        public ?string $length = 'moyen'
    ) {}

    public function getArticleId(): int
    {
        return $this->articleId;
    }

    public function getTopic(): string
    {
        return $this->topic;
    }

    public function getTone(): ?string
    {
        return $this->tone;
    }

    public function getLength(): ?string
    {
        return $this->length;
    }
}