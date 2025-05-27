import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

// Determine the GraphQL endpoint based on environment
const getGraphQLEndpoint = () => {
  // Check if we have an environment variable set (for production)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // For local development, use relative path
  return `/graphql`;
};

const httpLink = new HttpLink({
  uri: getGraphQLEndpoint(),
  credentials: 'include',
});

const errorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ extensions }) => {
      if (extensions?.code === 'UNAUTHENTICATED') {
        window.location.href = '/login';
      }
    });
  }
});

const client = new ApolloClient({
  link: ApolloLink.from([errorLink, httpLink]), // Combine errorLink and httpLink
  cache: new InMemoryCache(),
});

export default client;