import { createTestClient } from 'apollo-server-testing';
import { ApolloServer, gql, PubSub } from 'apollo-server-express';
import schema from '../../graphql/index';
import { users } from '../../db/db';

describe('Query.chat', () => {
  it('should fetch specified chat', async () => {
    const server = new ApolloServer({
      schema,
      context: () => ({
        pubsub: new PubSub(),
        currentUser: users[0],
      }),
    });

    const { query } = createTestClient(server);

    const res = await query({
      variables: { chatId: '1' },
      query: gql`
        query GetChat($chatId: ID!) {
          chat(chatId: $chatId) {
            id
            name
            picture
            lastMessage {
              id
              content
              createdAt
            }
          }
        }
      `,
    });

    expect(res.data).toBeDefined();
    expect(res.errors).toBeUndefined();
    expect(res.data).toMatchSnapshot();
  });
});
