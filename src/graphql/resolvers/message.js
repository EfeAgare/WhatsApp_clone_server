import { withFilter } from 'apollo-server-express';
import sql from 'sql-template-strings';
import { pool } from '../../db/config';
import pubsub from '../context/pubsub';

export default {
  Message: {
    createdAt(message) {
      return new Date(message.created_at);
    },
    async chat(message, args, { db }) {
      const { rows } = await db.query(
        sql`SELECT * FROM chats WHERE id = ${message.chat_id}`
      );
      return rows[0] || null;
    },

    async sender(message, args, { db }) {
      const { rows } = await db.query(
        sql`SELECT * from users WHERE id =${message.sender_user_id}`
      );
      return rows[0] || null;
    },

    async recipient(message, args, { db }) {
      const { rows } = await db.query(sql`
      SELECT users.* FROM users, chats_users
      WHERE chats_users.user_id != ${message.sender_user_id}
      AND chats_users.chat_id = ${message.chat_id}
    `);
      return rows[0] || null;
    },

    isMine(message, args, { currentUser }) {
      return message.sender_user_id === currentUser.id;
    },
  },
  Query: {},

  Mutation: {
    async addMessage(root, { chatId, content }, { currentUser, db }) {
      if (!currentUser) return null;

      const { rows } = await db.query(sql`
        INSERT INTO messages(chat_id, sender_user_id, content)
        VALUES(${chatId}, ${currentUser.id}, ${content})
        RETURNING *
      `);

      const messageAdded = rows[0];

      pubsub.publish('messageAdded', {
        messageAdded,
      });

      return messageAdded;
    },

    async deleteMessage(root, { chatId, messageId }, { currentUser, db }) {
      if (!currentUser) return null;

      try {
        await db.query('BEGIN');
        const { rows } = await db.query(sql`
        SELECT * FROM messages WHERE chat_id = ${chatId}
        AND id = ${messageId}
      `);

        const deleteMessage = {
          id: rows[0].id,
          content: rows[0].content,
          created_at: rows[0].created_at,
          chat_id: rows[0].chat_id,
          sender_user_id: rows[0].sender_user_id,
          ok: true,
        };
        if (deleteMessage) {
          pubsub.publish('deleteMessage', {
            deleteMessage,
          });

          await db.query(sql`DELETE FROM messages WHERE chat_id = ${chatId}
          AND id = ${messageId}`);

          await db.query('COMMIT');
          return { ok: true };
        } else {
          return { ok: false };
        }
      } catch (error) {
        await db.query('ROLLBACK');
        throw e;
      }
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        (root, args) => pubsub.asyncIterator('messageAdded'),
        async ({ messageAdded }, args, { currentUser }) => {
          if (!currentUser) return false;

          const { rows } = await pool.query(sql`
          SELECT * FROM chats_users
          WHERE chat_id = ${messageAdded.chat_id}
          AND user_id = ${currentUser.id}`);

          return !!rows.length;
        }
      ),
    },
    deleteMessage: {
      subscribe: withFilter(
        (root, args) => pubsub.asyncIterator('deleteMessage'),
        async ({ deleteMessage }, args, { currentUser }) => {
          if (!currentUser || !deleteMessage) return false;

          return (
            deleteMessage.chat_id === parseInt(args.chatId) &&
            deleteMessage.id === parseInt(args.messageId)
          );
        }
      ),
    },
  },
};
