import { createTestClient } from 'apollo-server-testing';
import { ApolloServer, gql } from 'apollo-server-express';
import schema from '../../graphql/index';
import { pool } from '../../db/config';
import { MyContext } from '../../graphql/context/context';
import sql from 'sql-template-strings';

describe('Query.getUsers', () => {
  afterEach(async () => await pool.end());
  it('should fetch all users except the one signed-in', async () => {
    const { rows } = await pool.query(sql`SELECT * FROM users WHERE id = 2`);

    const currentUser = rows[0];

    const server = new ApolloServer({
      schema,
      context: async () => ({ currentUser, db: await pool.connect() }),

      // @ts-ignore
      formatResponse: (res: any, { context }: { context: MyContext }) => {
        context.db.release();
        return res;
      },
    });

    const { query } = createTestClient(server);

    let res = await query({
      query: gql`
        query GetUsers {
          users {
            id
            name
            picture
          }
        }
      `,
    });

    expect(res.data).toBeDefined();
    expect(res.errors).toBeUndefined();
    expect(res.data).toMatchSnapshot();

    res = await query({
      query: gql`
        query GetUsers {
          users {
            id
            name
            picture
          }
        }
      `,
    });

    expect(res.data).toBeDefined();
    expect(res.errors).toBeUndefined();
    expect(res.data).toMatchSnapshot();
  });
});
