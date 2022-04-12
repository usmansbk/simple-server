import QueryError from "~utils/errors/QueryError";
import { Fail, Success } from "~helpers/response";
import { WELCOME_BACK, WELCOME_NEW_USER } from "~constants/i18n";
import { ACCOUNT_STATUS } from "~constants/models";
import analytics from "~services/analytics";

export default {
  Mutation: {
    async loginWithSocialProvider(
      _parent,
      { input },
      { t, dataSources, jwt, clientId, cache }
    ) {
      try {
        const userInfo = await jwt.verifySocialToken(input);
        const [user, created] = await dataSources.users.findOrCreate({
          ...userInfo,
          status: ACCOUNT_STATUS.ACTIVE,
        });
        const { id, firstName } = user;

        const { accessToken, refreshToken, sid, exp } = jwt.generateAuthTokens({
          sub: id,
          aud: clientId,
        });

        // refresh token rotation
        await cache.set({
          key: `${clientId}:${id}`,
          value: sid,
          expiresIn: exp,
        });

        analytics.track({
          userId: id,
          event: "Logged In",
          properties: {
            provider: input.provider,
          },
        });

        const code = created ? WELCOME_NEW_USER : WELCOME_BACK;
        return Success({
          message: t(code, { firstName }),
          code,
          accessToken,
          refreshToken,
        });
      } catch (e) {
        if (e instanceof QueryError) {
          return Fail({
            message: t(e.message),
            code: e.code,
          });
        }
        throw e;
      }
    },
  },
};
