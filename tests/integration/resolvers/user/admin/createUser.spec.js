import { gql } from "apollo-server-express";
import createApolloTestServer from "tests/mocks/apolloServer";
import FactoryBot from "tests/factories";

const query = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      code
      message
      errors {
        field
        message
      }
      user {
        id
        email
      }
    }
  }
`;

describe("Mutation.createUser", () => {
  let server;
  beforeAll(() => {
    server = createApolloTestServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  test("should allow admin to create user", async () => {
    const user = await FactoryBot.create("user", {
      include: {
        roles: {
          attributes: {
            name: "admin",
          },
        },
      },
    });
    const currentUser = await FactoryBot.db("user")
      .scope("permissions")
      .findByPk(user.id);

    const input = FactoryBot.attributesFor("user");
    const res = await server.executeOperation(
      {
        query,
        variables: {
          input,
        },
      },
      { currentUser }
    );
    expect(res.data.createUser.user.email).toBe(input.email);
  });

  test("should not allow non-admin to create user", async () => {
    const user = await FactoryBot.create("user");
    const currentUser = await FactoryBot.db("user")
      .scope("permissions")
      .findByPk(user.id);

    const input = FactoryBot.attributesFor("user");
    const res = await server.executeOperation(
      {
        query,
        variables: {
          input,
        },
      },
      { currentUser }
    );
    expect(res.errors[0].message).toMatch("Unauthorized");
  });
});
