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
  }

  type Query {
    chats: [Chat!]!
  }
`;
