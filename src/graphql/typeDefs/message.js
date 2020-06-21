import { gql } from 'apollo-server-express';

export default gql`
  type Message {
    id: ID!
    content: String!
    createdAt: DateTime!
    chat: Chat
    sender: User
    recipient: User
    isMine: Boolean!
  }

  extend type Mutation {
    addMessage(chatId: ID!, content: String!): Message
    deleteMessage(chatId: ID!, messageId: ID!): DeleteResponse
  }

  extend type Subscription {
    messageAdded: Message!
    deleteMessage(chatId: ID, messageId: ID): DeleteResponse
  }
`;
