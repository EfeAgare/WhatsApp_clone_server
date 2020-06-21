import { pool } from './config';
import { dbSeeds } from './db';

const createChatsTable = `CREATE TABLE chats(
  id SERIAL PRIMARY KEY
);`;

const createUsersTable = `CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  username VARCHAR (50) UNIQUE NOT NULL,
  name VARCHAR (50) NOT NULL,
  password VARCHAR (255) NOT NULL,
  picture VARCHAR (255) NOT NULL,
  aboutMe VARCHAR (100) NOT NULL
);`;

const createChatUsersTable = `CREATE TABLE chats_users(
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);`;

const createMessagesTable = ` CREATE TABLE messages(
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);`;

const makeQuery = async (query) => {
  const db = await pool.connect();
  try {
    const res = await db.query(query);
    dbSeeds();
    db.release();
  } catch (error) {
    db.release();
    console.log(error.stack);
  }
};

makeQuery(
  `DROP TABLE IF EXISTS messages; DROP TABLE IF EXISTS chats_users; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS chats;${createChatsTable}${createUsersTable}${createChatUsersTable}${createMessagesTable}`
);
