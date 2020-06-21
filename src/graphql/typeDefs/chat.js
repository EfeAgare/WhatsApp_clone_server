import { gql } from 'apollo-server-express';

export default gql`
  type Chat {
    id: ID!
    name: String
    picture: URL
    lastMessage: Message
    messages: [Message!]!
    participants: [User!]!
  }

  type Response {
    ok: Boolean!
    user: User
    token: String
  }

  type DeleteResponse {
    ok: Boolean!
  }

  type ChatAdded {
    id: ID!
    ok: Boolean!
  }

  extend type Query {
    chats: [Chat!]!
    chat(chatId: ID!): Chat
  }

  extend type Mutation {
    addChat(recipientId: ID!): Chat
    removeChat(chatId: ID!): ID
  }

  extend type Subscription {
    chatAdded: ChatAdded
    chatRemoved: DeleteResponse
  }
`;
