import { makeExecutableSchema, IResolvers } from 'graphql-tools';
import resolvers from './resolvers';
import typeDefs from './typeDefs';

export default makeExecutableSchema({
  resolvers: resolvers as unknown as IResolvers,
  typeDefs,
});
