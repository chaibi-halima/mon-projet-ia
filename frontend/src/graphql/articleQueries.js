import { gql } from '@apollo/client';

export const GET_ARTICLES = gql`
  query GetArticles($page: Int, $title: String, $categoryName: String, $order: [ArticleFilter_order]) {
    articles(page: $page, title: $title, category_name: $categoryName, order: $order) {
      collection {
        id
        dbId
        title
        content
        imageUrl
        createdAt
        status
        category {
          id
          name
        }
      }
      paginationInfo {
        totalCount
      }
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      collection {
        id
        name
        # 💡 On demande le total d'articles liés à cette catégorie pour les stats
        articles {
          paginationInfo {
            totalCount
          }
        }
      }
    }
  }
`;

// 🌟 Mutation pour créer un article
export const CREATE_ARTICLE = gql`
  mutation CreateArticle($title: String!, $content: String!, $category: String, $imageUrl: String) {
    createArticle(input: { title: $title, content: $content, category: $category, imageUrl: $imageUrl }) {
      article {
        id
        title
      }
    }
  }
`;

// 🌟 3. Mutation de modification (API Platform 3 standard)
export const UPDATE_ARTICLE = gql`
  mutation UpdateArticle($id: ID!, $title: String!, $content: String!, $category: String, $imageUrl: String) {
    updateArticle(input: { id: $id, title: $title, content: $content, category: $category, imageUrl: $imageUrl }) {
      article {
        id
        title
      }
    }
  }
`;

// 🌟 4. Mutation de suppression
export const DELETE_ARTICLE = gql`
  mutation DeleteArticle($id: ID!) {
    deleteArticle(input: { id: $id }) {
      article {
        id
      }
    }
  }
`;