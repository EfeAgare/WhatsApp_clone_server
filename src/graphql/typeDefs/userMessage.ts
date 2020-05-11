import { gql } from 'apollo-server-express';

export default gql`
  scalar Date
  scalar URL

  type Message {
    id: ID!
    content: String!
    createdAt: Date!
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

  schema {
    query: Query
    mutation: Mutation
  }
`;
