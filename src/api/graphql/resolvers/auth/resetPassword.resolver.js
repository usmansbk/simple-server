import QueryError from "~utils/errors/QueryError";
import { BadRequest, Ok } from "~helpers/response";
import { INVALID_LINK, PASSWORD_CHANGED } from "~helpers/constants/i18n";
import {
  PASSWORD_KEY_PREFIX,
  supportedClients,
} from "~helpers/constants/tokens";

export default {
  Mutation: {
    async resetPassword(
      _,
      { input: { password, token } },
      { dataSources, store, t, jwt }
    ) {
      try {
        const { sub } = jwt.verify(token);
        const key = `${PASSWORD_KEY_PREFIX}:${sub}`;
        const expectedToken = await store.get(key);

        if (token !== expectedToken) {
          // we can report suspicious activity here
          throw new QueryError(INVALID_LINK);
        }

        await dataSources.users.updatePassword({ id: sub, password });

        await store.remove(key);

        // invalidate all refresh tokens
        supportedClients.forEach(async (clientId) => {
          await store.remove(`${sub}:${clientId}`);
        });

        // we can send an email here to inform user of the change...

        return Ok({
          message: t(PASSWORD_CHANGED),
        });
      } catch (error) {
        if (error instanceof QueryError) {
          return BadRequest({
            message: t(error.message),
            errors: error.cause?.errors,
          });
        }

        throw error;
      }
    },
  },
};
