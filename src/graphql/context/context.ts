import { PubSub } from 'apollo-server-express';
import { User } from '../../db/db';
import { Response } from 'express';

export type MyContext = {
  pubsub: PubSub;
  currentUser: User;
  res: Response;
};
