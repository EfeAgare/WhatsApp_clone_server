import { createTestClient } from 'apollo-server-testing';
import { ApolloServer, gql, PubSub } from 'apollo-server-express';
import schema from '../../graphql/index';
import { pool } from '../../db/config';
import  sql from 'sql-template-strings';
import { MyContext } from '../../graphql/context/context';

describe('Query.chats', () => {
  afterAll(async () => await pool.end());
  
  it('should fetch all chats', async () => {
    const { rows } = await pool.query(sql`SELECT * FROM users WHERE id = 2`);
  
    const currentUser = rows[0];

    const server = new ApolloServer({
      schema,
      context: async () => ({
        pubsub: new PubSub(),
        currentUser,
        db: await pool.connect(),
      }),

      formatResponse: (res: any, { context }: { context: MyContext }) => {
        context.db.release();
        return res;
      },
    });

    const { query } = createTestClient(server);

    const res = await query({
      query: gql`
        query GetChats {
          chats {
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
