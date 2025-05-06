import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import Cookies from 'js-cookie';

const httpLink = new HttpLink({
  uri: `/graphql`,
});

const authLink = new ApolloLink((operation, forward) => {
  const token = Cookies.get('token');
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : '', 
    },
  }));
  return forward(operation);
});

const client = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;