import { gql } from "apollo-server-express";
import dayjs from "dayjs";
import createApolloTestServer from "tests/mocks/apolloServer";
import FactoryBot from "tests/factories";
import cache from "~utils/cache";
import jwt from "~utils/jwt";
import { PASSWORD_KEY_PREFIX } from "~constants/auth";

const query = gql`
  mutation ResetPassword($input: PasswordResetInput!) {
    resetPassword(input: $input) {
      code
      message
      success
    }
  }
`;

describe("Mutation.resetPassword", () => {
  let server;
  let user;
  let token;
  beforeAll(async () => {
    await FactoryBot.truncate();
    server = createApolloTestServer();
    user = await FactoryBot.create("user");
    const result = jwt.generateToken({
      sub: user.id,
      aud: process.env.WEB_CLIENT_ID,
    });
    token = result.token;
    await cache.set({
      key: `${PASSWORD_KEY_PREFIX}:${user.id}`,
      value: result.token,
      expiresIn: dayjs.duration(1, "minutes").asMilliseconds(),
    });
  });

  test("should update password and logout", async () => {
    const password = "password1";
    const res = await server.executeOperation(
      {
        query,
        variables: {
          input: {
            token,
            password,
          },
        },
      },
      { currentUser: user }
    );

    await user.reload();
    const changed = await user.checkPassword(password);
    const sid = await cache.get(`${process.env.WEB_CLIENT_ID}:${user.id}`);

    expect(res.data.resetPassword).toEqual({
      code: "PasswordChanged",
      message: "PasswordChanged",
      success: true,
    });
    expect(changed).toBe(true);
    expect(sid).toBe(null);
  });

  test("should not allow used token", async () => {
    const newPassword = "password";
    const res = await server.executeOperation({
      query,
      variables: {
        input: {
          token,
          password: newPassword,
        },
      },
    });
    expect(res.data.resetPassword).toEqual({
      code: "InvalidLink",
      message: "InvalidLink",
      success: false,
    });
  });
});
