import { ApolloServer } from 'apollo-server-express';
import http from 'http';
import jwt from 'jsonwebtoken';
import sql from 'sql-template-strings';
import schema from './graphql/index';
import app from './expressApp';
import { origin, port, secret } from './env';
import { pool } from './db/config';
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
        console.log('here read');
        return {
          req,
          res,
          pubsub,
          db,
        };
      } else {
        console.log('here');
        const id = jwt.verify(token, secret);
        const { rows } = await pool.query(
          sql`SELECT * FROM users WHERE id = ${id}`
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

  subscriptions: {
    onConnect: async ({ token }, webSocket) => {
      console.log('connected');

      // console.log("token", token)
      // if (token != undefined || token != null) {
      //   const id = jwt.verify(token, secret);
      //   const { rows } = await pool.query(
      //     sql`SELECT * FROM users WHERE id = ${id}`
      //   );
      //   let currentUser = rows[0];
      //   return {
      //     currentUser,
      //   };
      // }
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
