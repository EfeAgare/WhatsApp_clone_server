import { createTestClient } from 'apollo-server-testing';
import { ApolloServer, PubSub, gql } from 'apollo-server-express';
import schema from '../../graphql/index';

import { pool } from '../../db/config';
import { MyContext } from '../../graphql/context/context';
import sql from 'sql-template-strings';

describe('Mutation.removeChat', () => {

  afterAll(async() => await pool.end());

  it('removes chat by id', async () => {
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

    const addChatRes = await mutate({
      variables: { chatId: '1' },
      mutation: gql`
        mutation RemoveChat($chatId: ID!) {
          removeChat(chatId: $chatId)
        }
      `,
    });

    expect(addChatRes.data).toBeDefined();
    expect(addChatRes.errors).toBeUndefined();
    expect(addChatRes.data!.removeChat).toEqual(null);

    const getChatRes = await query({
      variables: { chatId: '1' },
      query: gql`
        query GetChat($chatId: ID!) {
          chat(chatId: $chatId) {
            id
            name
            participants {
              id
            }
          }
        }
      `,
    });

    expect(addChatRes.data).toBeDefined();
    expect(getChatRes.errors).toBeUndefined();
    expect(addChatRes.data!.chat).toBeUndefined();
  });
});
