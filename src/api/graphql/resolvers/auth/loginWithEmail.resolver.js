import QueryError from "~utils/errors/QueryError";
import { BadRequest, Ok } from "~helpers/response";
import {
  INCORRECT_EMAIL_OR_PASSWORD,
  WELCOME_BACK,
} from "~helpers/constants/i18n";

export default {
  Mutation: {
    async loginWithEmail(
      _parent,
      { input },
      { dataSources, jwt, t, store, clientId }
    ) {
      try {
        const user = await dataSources.users.findByEmailAndPassword(input);

        if (!user) {
          throw new QueryError(INCORRECT_EMAIL_OR_PASSWORD);
        }

        const { id, firstName, language } = user;

        const { accessToken, refreshToken, refreshTokenId, exp } =
          jwt.generateAuthTokens({
            sub: id,
            aud: clientId,
            lng: language,
          });

        // refresh token rotation
        await store.set({
          key: `${clientId}:${id}`,
          value: refreshTokenId,
          expiresIn: exp,
        });

        return Ok({
          message: t(WELCOME_BACK, { firstName }),
          accessToken,
          refreshToken,
        });
      } catch (e) {
        if (e instanceof QueryError) {
          return BadRequest({
            message: t(e.message),
            code: e.code,
          });
        }
        throw e;
      }
    },
  },
};
