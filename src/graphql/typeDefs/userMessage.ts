import { gql } from 'apollo-server-express';

export default gql`
  scalar Date
  scalar URL

  type Message {
    id: ID!
    content: String!
    createdAt: Date!
    chat: Chat
    sender: User
    recipient: User
    isMine: Boolean!
  }

  type Chat {
    id: ID!
    name: String
    picture: URL
    lastMessage: Message
    messages: [Message!]!
    participants: [User!]!
  }

  type User {
    id: ID!
    name: String!
    picture: URL
  }

  type Query {
    chats: [Chat!]!
    chat(chatId: ID!): Chat
    users: [User!]!
  }

  type Mutation {
    addMessage(chatId: ID!, content: String!): Message
    addChat(recipientId: ID!): Chat
    removeChat(chatId: ID!) : ID
  }

  type Subscription {
    messageAdded: Message!
    chatAdded: Chat!
    chatRemoved: ID!
  }

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`;
