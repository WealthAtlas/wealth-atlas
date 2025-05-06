import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

const httpLink = new HttpLink({
  uri: `/graphql`,
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