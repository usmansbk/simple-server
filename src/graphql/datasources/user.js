import { ValidationError } from "~utils/errors";
import sendMail from "~services/mailer";
import { SIGNUP_FAILED } from "~helpers/constants";
import SequelizeDataSource from "./SequelizeDataSource";

export default class UserDS extends SequelizeDataSource {
  onError(error) {
    let e = error;
    if (error.errors) {
      e = new ValidationError(SIGNUP_FAILED, error.errors, this.context.t);
    }
    super.onError(e);
  }

  async createWithEmail(fields) {
    let user = await this.create(fields);

    sendMail({
      to: user.email,
      subject: "Welcome",
      text: "Welcome",
      html: "<h1>Welcome</h1>",
    });

    return user.toJSON();
  }
}
