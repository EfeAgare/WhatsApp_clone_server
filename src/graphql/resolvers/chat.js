import { DateTimeResolver, URLResolver } from 'graphql-scalars';
import { withFilter, GraphQLUpload } from 'apollo-server-express';

import sql from 'sql-template-strings';
import { pool } from '../../db/config';
import pubsub from '../context/pubsub';


export default {
  DateTime: DateTimeResolver,
  URL: URLResolver,
  Upload: GraphQLUpload,

  Chat: {
    async lastMessage(chat, args, { currentUser, db }) {
      const { rows } = await db.query(
        sql`SELECT * FROM messages WHERE chat_id = ${chat.id} ORDER BY created_at DESC LIMIT 1`
      );

      return rows[0];
    },

    async messages(chat, args, { currentUser, db }) {
      const { rows } = await db.query(
        sql`SELECT * FROM messages WHERE chat_id = ${chat.id}`
      );
      return rows;
    },

    async name(chat, args, { currentUser, db }) {
      if (!currentUser) return null;

      const { rows } = await db.query(sql`
      SELECT users.* FROM users, chats_users
      WHERE users.id != ${currentUser.id}
      AND users.id = chats_users.user_id
      AND chats_users.chat_id = ${chat.id}`);

      const participant = rows[0];

      return participant ? participant.name : null;
    },

    async picture(chat, args, { currentUser, db, dataSources }) {
      if (!currentUser) return null;

      const { rows } = await db.query(sql`
      SELECT users.* FROM users, chats_users
      WHERE users.id != ${currentUser.id}
      AND users.id = chats_users.user_id
      AND chats_users.chat_id = ${chat.id}`);

      const participant = rows[0];

      return participant.picture;
    },

    async participants(chat, args, { currentUser, db }) {
      const { rows } = await db.query(sql`
        SELECT users.* FROM users, chats_users
        WHERE chats_users.chat_id = ${chat.id}
        AND chats_users.user_id = users.id
      `);

      return rows;
    },
  },
  Query: {
    async chats(root, args, { currentUser, db }, info) {

      if (!currentUser) return [];
      const { rows } = await db.query(sql`
      SELECT chats.* FROM chats, chats_users
      WHERE chats.id = chats_users.chat_id
      AND chats_users.user_id = ${currentUser.id}
    `);

      return rows;
    },

    async chat(root, { chatId }, { currentUser, db }, info) {
      if (!currentUser) return null;

      const { rows } = await db.query(sql`
      SELECT chats.* FROM chats, chats_users
      WHERE chats_users.chat_id = ${chatId}
      AND chats.id = chats_users.chat_id
      AND chats_users.user_id = ${currentUser.id}
    `);

      return rows[0] ? rows[0] : null;
    },
  },

  Mutation: {
    async addChat(root, { recipientId }, { currentUser, db }) {
      if (!currentUser) return null;

      const { rows } = await db.query(sql`
        SELECT chats.* FROM chats, (SELECT * FROM chats_users WHERE user_id = ${currentUser.id}) AS chats_of_current_user, chats_users
        WHERE chats.id = chats_users.chat_id
        AND chats_of_current_user.chat_id = chats_users.chat_id
        AND chats_users.user_id = ${recipientId}
      `);

      let chatAdded;
      // If there is already a chat between these two users, return it

      if (rows[0]) {
        chatAdded = { id: rows[0].id, ok: true };
        pubsub.publish('chatAdded', {
          chatAdded,
        });
        return rows[0];
      }

      try {
        await db.query('BEGIN');
        const { rows } = await db.query(sql`
          INSERT INTO chats
          DEFAULT VALUES
          RETURNING *
        `);

        chatAdded = { id: rows[0].id, ok: true };

        await db.query(sql`
          INSERT INTO chats_users(chat_id, user_id)
          VALUES(${chatAdded.id}, ${currentUser.id})
        `);

        await db.query(sql`
          INSERT INTO chats_users(chat_id, user_id)
          VALUES(${chatAdded.id}, ${recipientId})
        `);

        await db.query('COMMIT');

        pubsub.publish('chatAdded', {
          chatAdded,
        });

        return chatAdded;
      } catch (e) {
        await db.query('ROLLBACK');
        throw e;
      }
    },

    async removeChat(root, { chatId }, { currentUser, db }) {
      if (!currentUser) return null;

      try {
        await db.query('BEGIN');
        const { rows } = await db.query(sql`
        SELECT chats.* FROM chats, chats_users
        WHERE id = ${chatId}
        AND chats.id = chats_users.chat_id
        AND chats_users.user_id = ${currentUser.id}
      `);
        const chat = rows[0];

        if (!chat) {
          await db.query('ROLLBACK');
          return null;
        }

        await db.query(sql`
      DELETE FROM chats WHERE chats.id = ${chatId}
    `);

        const chatRemoved = { id: chat.id, ok: true };
        pubsub.publish('chatRemoved', {
          chatRemoved,
          targetChat: chat,
        });

        await db.query('COMMIT');
        return chatId;
      } catch (e) {
        await db.query('ROLLBACK');
        throw e;
      }
    },
  },
  Subscription: {
    chatAdded: {
      subscribe: withFilter(
        (root, args) => pubsub.asyncIterator('chatAdded'),
        async ({ chatAdded }, args, { currentUser }) => {
          if (!currentUser) return false;

          const { rows } = await pool.query(sql`
            SELECT * FROM chats_users
            WHERE chat_id = ${chatAdded.id}
            AND user_id = ${currentUser.id}`);

          return !!rows.length;
        }
      ),
    },

    chatRemoved: {
      subscribe: withFilter(
        (root, args) => pubsub.asyncIterator('chatRemoved'),
        async ({ targetChat }, args, { currentUser }) => {
          if (!currentUser) return false;

          const { rows } = await pool.query(sql`
            SELECT * FROM chats_users
            WHERE chat_id = ${targetChat.id}
            AND user_id = ${currentUser.id}`);

          console.log('!!rows.length', !!rows.length);
          return !!rows.length;
        }
      ),
    },
  },
};
