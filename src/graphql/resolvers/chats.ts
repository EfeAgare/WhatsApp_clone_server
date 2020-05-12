import { DateTimeResolver, URLResolver } from 'graphql-scalars';
import { Message, chats, messages } from '../../db/db';

import { Resolvers } from '../typeDefs/graphql.d';

const resolvers: Resolvers = {
  Date: DateTimeResolver,
  URL: URLResolver,

  Message: {
    chat(message) {
      return (
        chats.find((c) => c.messages.some((m) => m === message.id)) || null
      );
    },
  },

  Chat: {
    lastMessage(chat) {
      const lastMessage = chat.messages[chat.messages.length - 1];

      return messages.find((m) => m.id === lastMessage) || null;
    },
    messages(chat) {
      return messages.filter((m) => chat.messages.includes(m.id));
    },
  },
  Query: {
    chats(root, args, context, info) {
      console.log("chats")
      return chats;
    },
    chat(root, { chatId }, context, info) {
      console.log("chat")
      return chats.find((c) => c.id === chatId);
    },
  },

  Mutation: {
    addMessage(root, { chatId, content }, { pubsub }) {
      const chatIndex = chats.findIndex((c) => c.id === chatId);

      if (chatIndex === -1) return null;

      const chat = chats[chatIndex];

      const messagesIds = messages.map((currentMessage) =>
        Number(currentMessage.id)
      );
      const messageId = String(Math.max(...messagesIds) + 1);
      const message: Message = {
        id: messageId,
        createdAt: new Date(),
        content,
      };

      messages.push(message);
      chat.messages.push(messageId);
      // The chat will appear at the top of the ChatsList component
      chats.splice(chatIndex, 1);
      chats.unshift(chat);

      pubsub.publish('messageAdded', {
        messageAdded: message,
      });

      return message;
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: (root, args, { pubsub }) =>
        pubsub.asyncIterator('messageAdded'),
    },
  },
};

export default resolvers;
