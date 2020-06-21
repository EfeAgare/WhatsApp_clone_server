import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from 'sql-template-strings';
import { secret } from '../../env';
import { validatePassword, validateLength } from '../../utils/validation';
import { setHeaders } from '../../utils/setHeaders';
import pubsub from '../context/pubsub';
import cloudinary from '../../cloudinary';

export default {
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
  Subscription: {},
};
