import * as jwt from "~utils/jwt";
import i18n from "~config/i18n";
import store from "~services/store";
import TokenError from "~utils/errors/TokenError";
import { TOKEN_INVALID_ERROR } from "~helpers/constants/i18n";

const refreshToken = async (req, res) => {
  const {
    authorization,
    refresh_token: rfToken,
    client_id: clientId,
  } = req.headers;

  const t = i18n(req.language || req.locale);

  try {
    const expiredToken = jwt.decode(authorization);
    const decodedRefreshToken = jwt.verify(rfToken); // this will throw an error if invalid

    const key = `${expiredToken.sub}:${clientId}`;
    const expectedJti = await store.get(key);

    if (decodedRefreshToken.jti !== expectedJti) {
      throw new TokenError(TOKEN_INVALID_ERROR);
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenId,
      exp,
    } = jwt.generateAuthTokens({
      aud: clientId,
      sub: decodedRefreshToken.sub,
      language: expiredToken.language,
    });

    // rotate refresh token
    await store.set({
      key,
      value: refreshTokenId,
      expiresIn: exp,
    });

    res.send({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (e) {
    res.status(403).send({
      success: false,
      message: t(e.message),
    });
  }
};

export default {
  refreshToken,
};
