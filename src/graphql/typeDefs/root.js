import { gql } from 'apollo-server-express';

export default gql`
  scalar DateTime
  scalar URL
  scalar Upload

  type Query {
    _: Boolean
  }

  type Mutation {
    _: Boolean
  }

  type Subscription {
    _: Boolean
  }
`;
