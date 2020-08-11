import { gql } from 'apollo-server-express';

export default gql`
  type User {
    id: ID!
    phonenumber: String!
    picture: URL
    username: String!
    aboutme: String
  }

  extend type Query {
    users: [User!]!
    me: User
  }

  extend type Mutation {
    signIn(username: String!, aboutMe: String!, phoneNumber: String!): Response
    signUp(
      name: String!
      username: String!
      password: String!
      passwordConfirm: String!
    ): Response
    updateUser(name: String!, aboutMe: String!, file: Upload): User!
  }
`;
