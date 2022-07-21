import authorizer from '@sempervirens/authorizer';
import dao from '@sempervirens/dao';
import Emailer from '@sempervirens/emailer';
import { RequestHandler } from '@sempervirens/endpoint';

class ResetPasswordRequestHandler extends RequestHandler {

  #baseUrl;
  #emailConfig;
  #Model;

  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#baseUrl = data.baseUrl;
    this.#emailConfig = data.emailConfig;
    this.#Model = dao.getModel(data.dbName, data.modelName);
    this.#init(req.params, req.body);
  }

  async #init({ action }, {
    email = '',
    token = '',
    password = '',
    repeatPassword = ''
  }) {
    try {
      if (action == 'email') {
        await this.#email(email);
      } else if (action == 'reset') {
        await this.#reset({
          token,
          password,
          repeatPassword
        });
      }
      this.send();
    } catch(error) {
      this.error({ number: 535409, error });
    }
  }

  async #email(email) {

    if (!email) {
      throw new Error('USER_ERROR: Email is required.');
    } else if (!this.#emailConfig) {
      throw new Error([
        'SCRIPT_ERROR: "emailConfig" must be passed into the site loader config. ',
        'See https://www.npmjs.com/package/@sempervirens/plugin-authentication-endpoints ',
        'for more information.'
      ].join(''));
    }

    const record = await this.#Model
      .findOne({ email })
      .lean();

    if (!record?._id) {
      throw new Error('USER_ERROR: Not registered');
    }

    const {
      subject,
      template,
      resetLinkExpiresIn
    } = this.#emailConfig.emails.resetPasswordEmail;

    await Emailer.send({
      ...this.#emailConfig,
      subject,
      to: email,
      body: template({
        record,
        baseUrl: this.#baseUrl,
        token: authorizer.encrypt({
          expiresIn: resetLinkExpiresIn || '10m',
          data: { _id: record._id.toString() }
        })
      })
    });

  }

  async #reset({
    token,
    password,
    repeatPassword
  }) {

    if (!token) {
      throw new Error('USER_ERROR: Token is required.');
    } else if (!authorizer.isValid(token)) {
      throw new Error('USER_ERROR: Token is invalid.');
    } else if (!password) {
      throw new Error('USER_ERROR: Password is required.');
    } else if (!repeatPassword) {
      throw new Error('USER_ERROR: Repeat Password is required.');
    } else if (repeatPassword != password) {
      throw new Error('USER_ERROR: Passwords do not match.');
    }

    const { _id } = authorizer.decrypt(token);
    const record = await this.#Model.findById(_id);

    if (!record) {
      throw new Error('USER_ERROR: Token is invalid.');
    }

    record.password = password;
    await record.save();

  }

}

export default ResetPasswordRequestHandler;