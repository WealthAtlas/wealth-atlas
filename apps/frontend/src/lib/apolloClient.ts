import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const httpLink = new HttpLink({
  uri: `/graphql`,
  credentials: 'include', 
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

export default client;