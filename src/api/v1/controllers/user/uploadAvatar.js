import multer from "multer";
import numeral from "numeral";
import multerS3 from "multer-s3";
import { nanoid } from "nanoid";
import { UserInputError } from "apollo-server-core";
import { s3 } from "~services/aws";
import {
  IMAGE_TOO_LARGE,
  NOTHING_TO_UPLOAD,
  UNSUPPORTED_FILE_TYPE,
} from "~constants/i18n";
import {
  AVATARS_FOLDER,
  SUPPORTED_PROFILE_PICTURE_FILE_TYPES,
  PROFILE_PICTURE_MAX_FILE_SIZE,
  BYTES,
} from "~constants/files";

const { S3_BUCKET } = process.env;

const upload = multer({
  storage: multerS3({
    s3,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata(_req, file, cb) {
      cb(null, { fieldName: file.fieldname, originalName: file.originalname });
    },
    key(_req, _file, cb) {
      cb(null, `${AVATARS_FOLDER}/${nanoid()}`);
    },
  }),
  limits: {
    fileSize: PROFILE_PICTURE_MAX_FILE_SIZE,
  },
  fileFilter(_req, file, cb) {
    if (!SUPPORTED_PROFILE_PICTURE_FILE_TYPES.includes(file.mimetype)) {
      cb(new UserInputError(UNSUPPORTED_FILE_TYPE));
    } else {
      cb(null, true);
    }
  },
}).single("avatar");

const uploadAvatar = async (req, res) => {
  upload(req, res, async (err) => {
    const {
      context: { fileStorage, currentUser },
      t,
      file,
    } = req;

    if (err instanceof multer.MulterError) {
      let { message } = err;

      if (message === "File too large") {
        message = IMAGE_TOO_LARGE;
      }
      res.status(400).send({
        success: false,
        message: t(message, {
          size: numeral(PROFILE_PICTURE_MAX_FILE_SIZE).format(BYTES),
        }),
      });
    } else if (err) {
      res.status(400).send({
        success: false,
        message: t(err.message),
      });
    } else {
      try {
        if (!file) {
          throw new UserInputError(NOTHING_TO_UPLOAD);
        }

        const {
          mimetype: mimeType,
          originalname: name,
          size,
          bucket,
          key,
        } = file;

        const avatar = {
          key,
          bucket,
          name,
          mimeType,
          size,
        };

        if (currentUser.avatar) {
          await fileStorage.remove(currentUser.avatar);
          await currentUser.cache().update({ avatar });
        }

        res.send({
          success: true,
          avatar,
        });
      } catch (error) {
        if (file) {
          fileStorage.remove(file);
        }

        res.status(400).send({
          success: false,
          message: t(error.message),
        });
      }
    }
  });
};

export default uploadAvatar;
