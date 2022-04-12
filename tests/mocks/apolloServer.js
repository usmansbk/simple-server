import { ApolloServer } from "apollo-server-express";
import { createSchema } from "~api/graphql";
import dataSources from "~api/graphql/datasources";
import db from "~db/models";
import otp from "~utils/otp";
import jwt from "~utils/jwt";
import mailer from "~utils/mailer";
import cache from "~utils/cache";
import storage from "~utils/storage";
import getUser from "~helpers/getUser";

const clientId = process.env.WEB_CLIENT_ID;

const auth = async (user) => {
  const currentUser = await getUser(user.id);
  const { accessToken, sid } = await jwt.generateAuthTokens({
    aud: clientId,
    sub: user.id,
  });
  const isAdmin = currentUser.hasRole(["admin"]);
  const isRootUser = currentUser.hasRole(["root"]);

  return {
    isAdmin,
    isRootUser,
    currentUser,
    accessToken,
    sessionId: sid,
    tokenInfo: { sid, sub: user.id },
  };
};

const createApolloTestServer = () => {
  const schema = createSchema();
  const server = new ApolloServer({
    schema,
    dataSources,
    context: async ({ currentUser } = {}) => {
      let payload = {};

      if (currentUser) {
        payload = await auth(currentUser);
      }

      return {
        t: (msg) => msg,
        db,
        otp,
        jwt,
        cache,
        mailer,
        clientId,
        storage,
        ...payload,
      };
    },
  });

  return server;
};

export default createApolloTestServer;
