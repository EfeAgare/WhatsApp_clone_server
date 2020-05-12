import { gql } from 'apollo-server-express';

export default gql`
  scalar Date
  scalar URL

  type Message {
    id: ID!
    content: String!
    createdAt: Date!
    chat: Chat
  }

  type Chat {
    id: ID!
    name: String!
    picture: URL
    lastMessage: Message
    messages: [Message!]!
  }

  type Query {
    chats: [Chat!]!
    chat(chatId: ID!): Chat
  }

  type Mutation {
    addMessage(chatId: ID!, content: String!): Message
  }

  type Subscription {
    messageAdded: Message!
  }

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`;
