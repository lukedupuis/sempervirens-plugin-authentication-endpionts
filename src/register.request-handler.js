import dao from '@sempervirens/dao';
import Emailer from '@sempervirens/emailer';
import { RequestHandler } from '@sempervirens/endpoint';

class RegisterRequestHandler extends RequestHandler {

  #Model;
  #baseUrl;
  #emailConfig;

  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#baseUrl = data.baseUrl;
    this.#emailConfig = data.emailConfig;
    this.#Model = dao.getModel(data.dbName, data.modelName);
    this.#init(req.body);
  }

  async #init(body) {
    try {
      const { _id } = await this.#register(body);
      this.#emailConfig && await this.#email(body);
      this.send({ data: { _id } });
    } catch(error) {
      this.error({ number: 345038, error });
    }
  }

  async #register(body) {
    if (!body.email) {
      throw new Error('USER_ERROR: Email is required.');
    } else if (!body.password) {
      throw new Error('USER_ERROR: Password is required.');
    } else if (!body.repeatPassword) {
      throw new Error('USER_ERROR: Repeat Password is required.');
    } else if (body.repeatPassword != body.password) {
      throw new Error('USER_ERROR: Passwords do not match.');
    } else if (await this.#Model.findOne({ email: body.email }).lean()) {
      throw new Error('USER_ERROR: Registration already exists.');
    }
    const toCreate = { ...body };
    delete toCreate.repeatPassword;
    return await this.#Model.create(toCreate);
  }

  async #email(body) {
    const { subject, template } = this.#emailConfig.emails.registerEmail;
    await Emailer.send({
      ...this.#emailConfig,
      subject,
      to: body.email,
      body: template({
        requestBody: body,
        baseUrl: this.#baseUrl
      })
    });
  }

}

export default RegisterRequestHandler;