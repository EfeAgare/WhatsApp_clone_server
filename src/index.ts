import express from 'express';
import cors from 'cors';
import { chats } from './db/db';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

const port = process.env.PORT || 4000;

app.use(cors());
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

app.get('/', (req, res) => {
  res.status(200).json('Welcome');
});

app.get('/_ping', (req, res) => {
  res.status(200).send('pong');
});

app.get('/chats', (req, res) => {
  res.status(200).json(chats);
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
