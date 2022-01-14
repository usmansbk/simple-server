import sendMail from "~services/mailer";
import links from "~helpers/links";
import { Accepted } from "~helpers/response";
import emailTemplates from "~helpers/constants/emailTemplates";
import { SENT_VERIFICATION_EMAIL } from "~helpers/constants/i18n";
import {
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
  EMAIL_VERIFICATION_TOKEN_PREFIX,
} from "~helpers/constants/tokens";

export default {
  Mutation: {
    async requestEmailVerification(
      _,
      _args,
      { dataSources, locale, store, t, jwt, clientId }
    ) {
      const user = await dataSources.users.currentUser();

      const { language, firstName, id, email } = user;

      const { token, exp } = jwt.generateToken(
        {
          aud: clientId,
          sub: id,
        },
        EMAIL_VERIFICATION_TOKEN_EXPIRES_IN
      );

      await store.set({
        key: `${EMAIL_VERIFICATION_TOKEN_PREFIX}:${id}`,
        value: token,
        expiresIn: exp,
      });

      sendMail({
        template: emailTemplates.VERIFY_EMAIL,
        message: {
          to: email,
        },
        locals: {
          locale: language || locale,
          name: firstName,
          link: links.verifyEmail(token),
        },
      });

      return Accepted({
        message: t(SENT_VERIFICATION_EMAIL, { email }),
      });
    },
  },
};
