import sql from 'sql-template-strings';
import 'dotenv/config';
import { pool } from './config';
import { resetDb as dbReset } from '../env';

export const dbSeeds = async () => {
  const sampleUsers = [
    {
      id: '1',
      phoneNumber: '08052467898',
      username: 'ray',
      aboutMe: "I'm getting better",
      picture: 'https://randomuser.me/api/portraits/thumb/lego/1.jpg',
    },
    {
      id: '2',
      username: 'ethan',
      phoneNumber: '09016787645',
      aboutMe: "I'm getting better",
      picture: 'https://randomuser.me/api/portraits/thumb/men/1.jpg',
    },
    {
      id: '3',
      username: 'bryan',
      phoneNumber: '09039678980',
      aboutMe: "I'm getting better",
      picture: 'https://randomuser.me/api/portraits/thumb/men/2.jpg',
    },
    {
      id: '4',
      username: 'avery',
      phoneNumber: '09039678547',
      aboutMe: "I'm getting better",
      picture: 'https://randomuser.me/api/portraits/thumb/women/1.jpg',
    },
    {
      id: '5',
      username: 'katie',
      phoneNumber: '09039678548',
      aboutMe: "I'm getting better",
      picture: 'https://randomuser.me/api/portraits/thumb/women/2.jpg',
    },
  ];

  for (const sampleUser of sampleUsers) {
    await pool.query(sql`
      INSERT INTO users(id, username, phoneNumber , picture, aboutMe)
      VALUES(${sampleUser.id}, ${sampleUser.username}, ${sampleUser.phoneNumber}, ${sampleUser.picture}, ${sampleUser.aboutMe})
    `);
  }

  await pool.query(sql`DELETE FROM chats`);

  const sampleChats = [
    {
      id: '1',
    },
    {
      id: '2',
    },
    {
      id: '3',
    },
    {
      id: '4',
    },
  ];

  for (const sampleChat of sampleChats) {
    await pool.query(sql`
      INSERT INTO chats(id)
      VALUES(${sampleChat.id})
    `);
  }


  await pool.query(sql`DELETE FROM chats_users`);

  const sampleChatsUsers = [
    {
      chat_id: '1',
      user_id: '1',
    },
    {
      chat_id: '1',
      user_id: '2',
    },
    {
      chat_id: '2',
      user_id: '1',
    },
    {
      chat_id: '2',
      user_id: '3',
    },
    {
      chat_id: '3',
      user_id: '1',
    },
    {
      chat_id: '3',
      user_id: '4',
    },
    {
      chat_id: '4',
      user_id: '1',
    },
    {
      chat_id: '4',
      user_id: '5',
    },
  ];

  for (const sampleChatUser of sampleChatsUsers) {
    await pool.query(sql`
      INSERT INTO chats_users(chat_id, user_id)
      VALUES(${sampleChatUser.chat_id}, ${sampleChatUser.user_id})
    `);
  }

  await pool.query(sql`DELETE FROM messages`);

  const baseTime = new Date('1 Jan 2019 GMT').getTime();

  const sampleMessages = [
    {
      id: '1',
      content: 'You on your way?',
      created_at: new Date(baseTime - 60 * 1000 * 1000),
      read: false,
      chat_id: '1',
      sender_user_id: '1',
    },
    {
      id: '2',
      content: "Hey, it's me",
      created_at: new Date(baseTime - 2 * 60 * 1000 * 1000),
      read: false,
      chat_id: '2',
      sender_user_id: '1',
    },
    {
      id: '3',
      content: 'I should buy a boat',
      created_at: new Date(baseTime - 24 * 60 * 1000 * 1000),
      chat_id: '3',
      read: false,
      sender_user_id: '1',
    },
    {
      id: '4',
      content: 'This is wicked good ice cream.',
      created_at: new Date(baseTime - 14 * 24 * 60 * 1000 * 1000),
      chat_id: '4',
      read: false,
      sender_user_id: '1',
    },
  ];

  for (const sampleMessage of sampleMessages) {
    await pool.query(sql`
      INSERT INTO messages(id, content, created_at, chat_id, sender_user_id, read)
      VALUES(${sampleMessage.id}, ${sampleMessage.content}, ${sampleMessage.created_at},
        ${sampleMessage.chat_id}, ${sampleMessage.sender_user_id}, ${sampleMessage.read})
    `);
  }

};
export const resetDb = async () => {
  dbSeeds;
};

if (dbReset) {
  resetDb();
}
