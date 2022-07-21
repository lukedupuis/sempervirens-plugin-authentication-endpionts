import dao from '@sempervirens/dao';
import { RequestHandler } from '@sempervirens/endpoint';

class LoginRequestHandler extends RequestHandler {

  #Model;

  constructor({ req, res, data, isSecure }) {
    super({ req, res, data, isSecure });
    this.#Model = dao.getModel(data.dbName, data.modelName);
    this.#init(req.body);
  }

  async #init({
    email = '',
    password = ''
  }) {
    try {
      const { _id } = await this.#login({
        email: email.toLowerCase(),
        password
      });
      this.send({ data: { _id } });
    } catch(error) {
      this.error({ number: 530587, error });
    }
  }

  async #login({
    email,
    password
  }) {
    if (!email) {
      throw new Error('USER_ERROR: Email is required.');
    } else if (!password) {
      throw new Error('USER_ERROR: Password is required.');
    }
    const record = await this.#Model.findOne({ email });
    if (record && !record.passwordMatches) {
      throw new Error('SCRIPT_ERROR: The User schema must have a method called "passwordMatches".');
    } else if (!record?.passwordMatches(password)) {
      throw new Error('USER_ERROR: Incorrect email or password');
    }
    return record;
  }

}

export default LoginRequestHandler;
