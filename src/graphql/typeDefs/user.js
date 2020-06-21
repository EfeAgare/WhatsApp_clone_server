import { gql } from 'apollo-server-express';

export default gql`
  scalar DateTime
  scalar URL
  scalar Upload

  type Message {
    id: ID!
    content: String!
    createdAt: DateTime!
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
    username: String!
    aboutMe: String
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
  
  type Query {
    chats: [Chat!]!
    chat(chatId: ID!): Chat
    users: [User!]!
    me: User
  }

  type Mutation {
    addMessage(chatId: ID!, content: String!): Message
    addChat(recipientId: ID!): Chat
    removeChat(chatId: ID!): ID
    deleteMessage(chatId: ID!, messageId: ID!): DeleteResponse
    signIn(username: String!, password: String!): Response
    signUp(
      name: String!
      username: String!
      password: String!
      passwordConfirm: String!
    ): Response
    updateUser(name: String!, aboutMe: String!, file: Upload): User!
  }

  type Subscription {
    messageAdded: Message!
    chatAdded: ChatAdded
    deleteMessage(chatId: ID, messageId: ID): DeleteResponse
    chatRemoved: DeleteResponse
  }

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`;
