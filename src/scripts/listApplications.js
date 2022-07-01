/* eslint-disable no-console */
import "dotenv/config";
import db from "~db/models";
import Sentry from "~services/sentry";
import log from "~utils/logger";

const { sequelize, Application } = db;

const listApplications = async () => {
  try {
    await sequelize.sync();
    const apps = await Application.findAll();

    console.log("MY APPS");
    apps.forEach((app) => console.log(app.name, ":", app.clientID));
  } catch (err) {
    Sentry.captureException(err);
    log.error({ err });
  }
  await sequelize.close();
};

listApplications();
