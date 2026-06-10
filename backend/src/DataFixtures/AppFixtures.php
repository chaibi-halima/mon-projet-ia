<?php

namespace App\DataFixtures;

use App\Entity\Category;
use App\Entity\User; // 💡 Ne pas oublier l'import de ton entité User
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    private UserPasswordHasherInterface $passwordHasher;

    // 💡 On injecte le hacheur de mot de passe de Symfony
    public function __construct(UserPasswordHasherInterface $passwordHasher)
    {
        $this->passwordHasher = $passwordHasher;
    }

    public function load(ObjectManager $manager): void
    {
        // 1. Création des catégories de base
        $catNames = ['Général', 'Technologie', 'Sport', 'Science', 'Lifestyle'];
        foreach ($catNames as $name) {
            $category = new Category();
            $category->setName($name);
            $manager->persist($category);
        }

        // 2. Création de ton utilisateur Admin
        $user = new User();
        $user->setEmail('admin@test.com');
        $user->setRoles(['ROLE_ADMIN']);

        // On hache le mot de passe "admin" proprement
        $hashedPassword = $this->passwordHasher->hashPassword(
            $user,
            'admin'
        );
        $user->setPassword($hashedPassword);
        
        $manager->persist($user);

        // On valide tout en base de données
        $manager->flush();
    }
}