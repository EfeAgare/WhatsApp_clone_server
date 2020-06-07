import { ApolloServer } from 'apollo-server-express';
import http from 'http';
import jwt from 'jsonwebtoken';
import sql from 'sql-template-strings';
import schema from './graphql/index';
import app from './expressApp';
import { origin, port, secret } from './env';
import { pool } from './db/config';
import { UnsplashApi } from './graphql/unsplash.api';
import pubsub from './graphql/context/pubsub';

let db;

const connectDb = async () => {
  db = await pool.connect();
};
const server = new ApolloServer({
  schema,
  context: async ({ req, res, connection }) => {
    // Access the request object

    if (connection) {
      // check connection for metadata
      return connection.context;
    } else {
      let currentUser;
      // check from req
      const token = req.headers['x-token'] || '';

      if (!token || token == 'undefined' || token == 'null') {
        return {
          req,
          res,
          pubsub,
          db,
        };
      } else {
        console.log('here');
        const username = jwt.verify(token, secret);
        const { rows } = await pool.query(
          sql`SELECT * FROM users WHERE username = ${username}`
        );
        currentUser = rows[0];
        return {
          req,
          res,
          currentUser,
          pubsub,
          token,
          db,
        };
      }
    }
  },
  dataSources: () => ({
    unsplashApi: new UnsplashApi(),
  }),
  subscriptions: {
    onConnect: async ({ token }, webSocket) => {
      console.log('connected');

      if (token != undefined || token != null) {
        const username = jwt.verify(token, secret);
        const { rows } = await pool.query(
          sql`SELECT * FROM users WHERE username = ${username}`
        );
        let currentUser = rows[0];
        return {
          currentUser,
        };
      }
    },
    onDisconnect: async (webSocket) => {
      console.log('Disconnected.');
    },
  },
});

server.applyMiddleware({
  app,
  path: '/graphql',
  cors: { credentials: true, origin },
});

export const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);
connectDb();
httpServer.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
