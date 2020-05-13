import express from 'express';
import cors from 'cors';
import { ApolloServer, PubSub } from 'apollo-server-express';
import http from 'http';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cookie from 'cookie';

import schema from './graphql/index';
import { users } from './db/db';

dotenv.config();
const app = express();

const port = process.env.PORT || 4000;

app.use(express.json());
app.use(cookieParser());

const origin = process.env.ORIGIN || 'http://localhost:3000';
app.use(cors({ credentials: true, origin }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Acess-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }
  next();
});

const pubsub = new PubSub();
const server = new ApolloServer({
  schema,
  context: (session: any) => {
    // Access the request object
    let req = session.connection
      ? session.connection.context.request
      : session.req;

    // It's subscription
    if (session.connection) {
      req.cookies = cookie.parse(req.headers.cookie || '');
    }

    return {
      currentUser: users.find((u) => u.id === req.cookies.currentUserId),
      pubsub,
    };
  },
});

server.applyMiddleware({
  app,
  path: '/graphql',
  cors: { credentials: true, origin },
});

app.get('/', (req, res) => {
  res.status(200).json('Welcome');
});

app.get('/_ping', (req, res) => {
  res.status(200).send('pong');
});

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

httpServer.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
