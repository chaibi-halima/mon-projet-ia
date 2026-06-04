<?php

namespace App\Message;

class GenerateArticleMessage
{
    public function __construct(
        private int $articleId,
        private string $title
    ) {}

    public function getArticleId(): int
    {
        return $this->articleId;
    }

    public function getTitle(): string
    {
        return $this->title;
    }
}