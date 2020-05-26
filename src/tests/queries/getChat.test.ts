import { createTestClient } from 'apollo-server-testing';
import { ApolloServer, gql, PubSub } from 'apollo-server-express';
import schema from '../../graphql/index';
import { resetDb } from '../../db/db';
import sql from 'sql-template-strings';
import { pool } from '../../db/config';
import { MyContext } from '../../graphql/context/context';

describe('Query.chat', () => {
  afterAll(async () => await pool.end());

  it('should fetch specified chat', async () => {
    const { rows } = await pool.query(sql`SELECT * FROM users WHERE id = 2`);

    const currentUser = rows[0];

    const server = new ApolloServer({
      schema,
      context: async () => ({
        pubsub: new PubSub(),
        currentUser,
        db: await pool.connect(),
      }),
      // @ts-ignore
      formatResponse: (res: any, context: MyContext) => {
        context.db.release();
        return res;
      },
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
