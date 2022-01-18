import QueryError from "~utils/errors/QueryError";
import verifySocialToken from "~utils/verifySocialToken";
import { BadRequest, Ok, Created } from "~helpers/response";
import { WELCOME_BACK, WELCOME_NEW_USER } from "~helpers/constants/i18n";

export default {
  Mutation: {
    async loginWithSocialProvider(
      _parent,
      { input },
      { t, dataSources, jwt, clientId, store }
    ) {
      try {
        const userInfo = await verifySocialToken(input);
        const [user, created] = await dataSources.users.findOrCreate(userInfo);
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

        const payload = {
          accessToken,
          refreshToken,
        };

        if (created) {
          // Send official welcome email here for new users...

          return Created({
            message: t(WELCOME_NEW_USER, { firstName }),
            ...payload,
          });
        }

        return Ok({
          message: t(WELCOME_BACK, { firstName }),
          ...payload,
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
