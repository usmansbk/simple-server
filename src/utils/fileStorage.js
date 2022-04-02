import retry from "retry";
import { s3 } from "~services/aws";
import log from "~utils/logger";

const remove = (options) => {
  const { key: Key, bucket: Bucket } = options || {};
  if (process.env.NODE_ENV === "test") {
    return;
  }
  if (!(Key && Bucket)) {
    return;
  }

  const operation = retry.operation({
    retries: 3,
  });

  operation.attempt(() => {
    s3.deleteObject({ Key, Bucket }, (err) => {
      if (operation.retry(err)) {
        log.error(err);
      }
    });
  });
};

const fileStorage = {
  remove,
};

export default fileStorage;
