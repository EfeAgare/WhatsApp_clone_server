import { DateTimeResolver, URLResolver } from 'graphql-scalars';
import { withFilter } from 'apollo-server-express';

import { User, Message, Chat, chats, messages, users } from '../../db/db';
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
    sender(message) {
      return users.find((u) => u.id === message.sender) || null;
    },

    recipient(message) {
      return users.find((u) => u.id === message.recipient) || null;
    },

    isMine(message, args, { currentUser }) {
      return message.sender === currentUser.id;
    },
  },

  Chat: {
    lastMessage(chat, args, { currentUser }) {
      const lastMessage = chat.messages[chat.messages.length - 1];

      return messages.find((m) => m.id === lastMessage) || null;
    },

    messages(chat, args, { currentUser }) {
      return messages.filter((m) => chat.messages.includes(m.id));
    },

    name(chat, args, { currentUser }) {
      if (!currentUser) return null;

      const participantId = chat.participants.find(
        (p: string) => p !== currentUser.id
      );

      if (!participantId) return null;

      const participant = users.find((u) => u.id === participantId);

      return participant ? participant.name : null;
    },

    picture(chat, args, { currentUser }) {
      if (!currentUser) return null;

      const participantId = chat.participants.find(
        (p: any) => p !== currentUser.id
      );

      console.log(participantId);
      if (!participantId) return null;

      const participant = users.find((u) => u.id === participantId);

      return participant ? participant.picture : null;
    },

    participants(chat, args, { currentUser }) {
      return chat.participants
        .map((p: any) => users.find((u) => u.id === p))
        .filter(Boolean) as User[];
    },
  },
  Query: {
    chats(root, args, { currentUser }, info) {
      if (!currentUser) return [];

      return chats.filter((c) => c.participants.includes(currentUser.id));
    },

    chat(root, { chatId }, { currentUser }, info) {
      if (!currentUser) return null;

      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;

      return chat.participants.includes(currentUser.id) ? chat : null;
    },

    users(root, args, { currentUser }) {
      if (!currentUser) return [];

      return users.filter((u) => u.id !== currentUser.id);
    },
  },

  Mutation: {
    addMessage(root, { chatId, content }, { pubsub, currentUser }) {
      if (!currentUser) return null;

      const chatIndex = chats.findIndex((c) => c.id === chatId);

      if (chatIndex === -1) return null;

      const chat = chats[chatIndex];

      if (!chat.participants.includes(currentUser.id)) return null;

      const messagesIds = messages.map((currentMessage) =>
        Number(currentMessage.id)
      );
      const messageId = String(Math.max(...messagesIds) + 1);
      const message: Message = {
        id: messageId,
        createdAt: new Date(),
        content,
        sender: currentUser.id,
        recipient: chat.participants.find(
          (p) => p !== currentUser.id
        ) as string,
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

    addChat(root, { recipientId }, { currentUser, pubsub }) {
      if (!currentUser) return null;
      if (!users.some((u) => u.id === recipientId)) return null;

      let chat = chats.find(
        (c) =>
          c.participants.includes(currentUser.id) &&
          c.participants.includes(recipientId)
      );

      if (chat) return chat;

      const chatsIds = chats.map((c) => Number(c.id));

      chat = {
        id: String(Math.max(...chatsIds) + 1),
        participants: [currentUser.id, recipientId],
        messages: [],
      };

      chats.push(chat);

      pubsub.publish('chatAdded', {
        chatAdded: chat,
      });

      return chat;
    },

    removeChat(root, { chatId }, { currentUser, pubsub }) {
      if (!currentUser) return null;
 
      const chatIndex = chats.findIndex(c => c.id === chatId);
 
      if (chatIndex === -1) return null;
 
      const chat = chats[chatIndex];
 
      if (!chat.participants.some(p => p === currentUser.id)) return null;
 
      chat.messages.forEach(chatMessage => {
        const chatMessageIndex = messages.findIndex(m => m.id === chatMessage);
 
        if (chatMessageIndex !== -1) {
          messages.splice(chatMessageIndex, 1);
        }
      });
 
      chats.splice(chatIndex, 1);

      pubsub.publish('chatRemoved', {
        chatRemoved: chat.id,
        targetChat: chat,
      });
 
      return chatId;
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        (root, args, { pubsub }) => pubsub.asyncIterator('messageAdded'),
        ({ messageAdded }, args, { currentUser }) => {
          if (!currentUser) return false;

          return [messageAdded.sender, messageAdded.recipient].includes(
            currentUser.id
          );
        }
      ),
    },

    chatAdded: {
      subscribe: withFilter(
        (root, args, { pubsub }) => pubsub.asyncIterator('chatAdded'),
        ({ chatAdded }: { chatAdded: Chat }, args, { currentUser }) => {
          if (!currentUser) return false;
 
          return chatAdded.participants.some(p => p === currentUser.id);
        }
      ),
    },

    chatRemoved: {
      subscribe: withFilter(
        (root, args, { pubsub }) => pubsub.asyncIterator('chatRemoved'),
        ({ targetChat }: { targetChat: Chat }, args, { currentUser }) => {
          if (!currentUser) return false;
 
          return targetChat.participants.some(p => p === currentUser.id);
        }
      ),
    },
  },
};

export default resolvers;
