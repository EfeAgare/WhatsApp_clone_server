import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { origin } from './env';

const app = express();
app.use(express.json());
app.use(cookieParser());

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

app.get('/', (req, res) => {
  res.status(200).json('Welcome');
});

app.get('/_ping', (req, res) => {
  res.status(200).send('pong');
});

export default app;
