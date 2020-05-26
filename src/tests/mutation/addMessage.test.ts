import { createTestClient } from 'apollo-server-testing';
import { ApolloServer, gql, PubSub } from 'apollo-server-express';
import schema from '../../graphql/index';
import { resetDb } from '../../db/db';
import { pool } from '../../db/config';
import  sql  from 'sql-template-strings';
import { MyContext } from '../../graphql/context/context';

describe('Mutation.addMessage', () => {
  // beforeEach(resetDb);
  afterAll(async() => await pool.end());

  it('should add message to specified chat', async () => {
    const { rows } = await pool.query(sql`SELECT * FROM users WHERE id = 1`);
   
    const currentUser = rows[0];
    const server = new ApolloServer({
      schema,
      context: async () => ({
        pubsub: new PubSub(),
        currentUser,
        db: await pool.connect(),
      }),
      // @ts-ignore
      formatResponse: (res: any, { context }: { context: MyContext }) => {
        context.db.release();
        return res;
      },
    });

    const { query, mutate } = createTestClient(server);

    const addMessageRes = await mutate({
      variables: { chatId: '1', content: 'Hello World' },
      mutation: gql`
        mutation AddMessage($chatId: ID!, $content: String!) {
          addMessage(chatId: $chatId, content: $content) {
            id
            content
          }
        }
      `,
    });

    expect(addMessageRes.data).toBeDefined();
    expect(addMessageRes.errors).toBeUndefined();
    expect(addMessageRes.data).toMatchSnapshot();

    const getChatRes = await query({
      variables: { chatId: '1' },
      query: gql`
        query GetChat($chatId: ID!) {
          chat(chatId: $chatId) {
            id
            lastMessage {
              id
              content
            }
          }
        }
      `,
    });

    expect(getChatRes.data).toBeDefined();
    expect(getChatRes.errors).toBeUndefined();
    expect(getChatRes.data).toMatchSnapshot();
  });
});
