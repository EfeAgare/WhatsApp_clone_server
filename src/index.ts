import { ApolloServer } from 'apollo-server-express';
import http from 'http';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import sql from 'sql-template-strings';

import schema from './graphql/index';
import app from './expressApp';
import { origin, port, secret } from './env';
import { pool, dbConfig } from './db/config';
const { PostgresPubSub } = require('graphql-postgres-subscriptions');
import { MyContext } from './graphql/context/context';
import { UnsplashApi } from './graphql/unsplash.api';

const pubsub = new PostgresPubSub(dbConfig);

const server = new ApolloServer({
  schema,
  context: async (session: any) => {
    // Access the request object
    let req = session.connection
      ? session.connection.context.request
      : session.req;

    // It's subscription
    if (session.connection) {
      req.cookies = cookie.parse(req.headers.cookie || '');
    }

    let currentUser;

    if (req.cookies.authToken) {
      const username = jwt.verify(req.cookies.authToken, secret) as string;
      if (username) {
        const { rows } = await pool.query(
          sql`SELECT * FROM users WHERE username = ${username}`
        );
        currentUser = rows[0];
      }
    }

    let db;

    if (!session.connection) {
      db = await pool.connect();
    }

    return {
      currentUser,
      pubsub,
      res: session.res,
      db,
    };
  },
  // @ts-ignore
  formatResponse: (res: any, { context }: { context: MyContext }) => {
    context.db.release();
    return res;
  },
  dataSources: () => ({
    unsplashApi: new UnsplashApi(),
  }),
});

server.applyMiddleware({
  app,
  path: '/graphql',
  cors: { credentials: true, origin },
});

export const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

httpServer.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
