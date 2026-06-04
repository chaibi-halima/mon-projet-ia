<?php

namespace App\Dto;

class OllamaArticleDto
{
    public string $seo_title = '';
    
    // 💡 MODIFICATION ICI : On accepte string OU array pour ne plus jamais crasher
    public string|array $content = ''; 
    
    public array $tags = [];
}