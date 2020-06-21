import { gql } from 'apollo-server-express';

export default gql`
  type User {
    id: ID!
    name: String!
    picture: URL
    username: String!
    aboutme: String
  }

  extend type Query {
    users: [User!]!
    me: User
  }

  extend type Mutation {
    signIn(username: String!, password: String!): Response
    signUp(
      name: String!
      username: String!
      password: String!
      passwordConfirm: String!
    ): Response
    updateUser(name: String!, aboutMe: String!, file: Upload): User!
  }
`;
