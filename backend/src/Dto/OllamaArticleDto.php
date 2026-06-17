<?php

namespace App\Dto;

class OllamaArticleDto {
    public string $seo_title;
    public string $content;
    /** @var string[] */
    public array $tags;
}