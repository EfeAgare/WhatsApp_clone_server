import { DateTimeResolver, URLResolver } from 'graphql-scalars';
import { withFilter, GraphQLUpload } from 'apollo-server-express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from 'sql-template-strings';
import { secret } from '../../env';
import { validatePassword, validateLength } from '../../utils/validation';
import { pool } from '../../db/config';
import { setHeaders } from '../../utils/setHeaders';
import pubsub from '../context/pubsub';
import cloudinary from '../../cloudinary';

const resolvers = {
  DateTime: DateTimeResolver,
  URL: URLResolver,
  Upload: GraphQLUpload,

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
    me(root, args, { currentUser }) {

      return {
        id: currentUser.id,
        username: currentUser.username,
        name: currentUser.name,
        picture: currentUser.picture,
        aboutme: currentUser.aboutme,
      };
    },

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

    async users(root, args, { currentUser, db }) {
      if (!currentUser) return [];

      const { rows } = await db.query(sql`
        SELECT * FROM users
        WHERE users.id != ${currentUser.id}
      `);
      return rows;
    },
  },

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

    async signIn(root, { username, password }, { res, db }) {
      console.log(username);
      const { rows } = await db.query(
        sql`SELECT * FROM users WHERE username = ${username}`
      );

      const user = rows[0];

      if (!user) {
        throw new Error('User not found');
      }

      const passwordMatch = bcrypt.compareSync(password, user.password);

      if (!passwordMatch) {
        throw new Error('Password and Email not current');
      }

      const token = jwt.sign(user.id, secret);
      setHeaders(token, res);

      return { ok: true, user, token };
    },

    async signUp(
      root,
      { name, username, password, passwordConfirm },
      { res, db }
    ) {
      validateLength('req.name', name, 3, 50);
      validateLength('req.username', username, 3, 18);
      validatePassword('req.password', password);

      if (password !== passwordConfirm) {
        throw Error("req.password and req.passwordConfirm don't match");
      }

      const existingUserQuery = await db.query(
        sql`SELECT * FROM users WHERE username = ${username}`
      );

      if (existingUserQuery.rows[0]) {
        throw Error('username already exists');
      }

      const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(8));

      const picture = 'https://randomuser.me/api/portraits/thumb/men/1.jpg';
      const createdUserQuery = await db.query(
        sql`INSERT INTO users(username, password, name, picture) VALUES (${username}, ${passwordHash}, ${name}, ${picture}) RETURNING *`
      );

      const user = createdUserQuery.rows[0];

      const token = jwt.sign(user.id, secret);

      setHeaders(token, res);

      return { ok: true, user, token };
    },

    async updateUser(
      roots,
      { name, aboutme, file, username },
      { currentUser, db }
    ) {
      try {
        let user;
        if (file != null) {
          const { createReadStream } = await file;
          const result = await new Promise((resolve, reject) => {
            createReadStream().pipe(
              cloudinary.v2.uploader.upload_stream((error, result) => {
                if (error) {
                  reject(error);
                }
                resolve(result);
              })
            );
          });

          user = await db.query(
            sql`UPDATE users SET name = ${name}, aboutme =${aboutme}, username =${username}, picture =${result.secure_url} WHERE id = ${currentUser.id} RETURNING *`
          );

        } else {
          user = await db.query(
            sql`UPDATE users SET name = ${name}, aboutme =${aboutme}, username =${username} WHERE id = ${currentUser.id} RETURNING *`
          );
        }
        return user.rows[0];
      } catch (error) {}
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

export default resolvers;
