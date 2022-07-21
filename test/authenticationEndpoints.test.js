import { expect } from 'chai';
import superagent from 'superagent';
import { readFileSync } from 'fs'
import dao from '@sempervirens/dao';
import authorizer from '@sempervirens/authorizer';
import Server from '@sempervirens/server';

import userSchema from './models/user.model.js';
import registerEmail from './emails/register.email.js';
import resetPasswordEmail from './emails/reset-password.email.js';

import authenticationEndpoints from '../index.js';

// Initialize authorizer

authorizer.init({
  jwtPublicKey: readFileSync('./security/jwt/jwtRS256.key.pub', 'utf8'),
  jwtPrivateKey: readFileSync('./security/jwt/jwtRS256.key', 'utf8')
});

// Initialize database

dao.initDb({
  host: 'localhost',
  port: '27017',
  connectionOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  name: 'testdb',
  models: [
    { name: 'User', schema: userSchema },
    { name: 'Person', schema: userSchema }
  ]
});

const User = dao.getModel('testdb', 'User');
const Person = dao.getModel('testdb', 'Person');

// Initialize test sites

const fromEmail = 'test3793793@gmail.com';
const email = 'test@test.com';
const first = 'First';
const last = 'Last';
const pw1 = 'asdfasdf';
const pw2 = 'asdfasdf1';

new Server({
  port: 8080,
  sites: [
    {
      domain: 'site-1',
      data: { dbName: 'testdb' },
      endpoints: [...authenticationEndpoints()]
    },
    {
      domain: 'site-2',
      data: { dbName: 'testdb' },
      endpoints: [...authenticationEndpoints({ modelName: 'Person' })]
    },
    {
      domain: 'site-3',
      data: { dbName: 'testdb' },
      endpoints: [...authenticationEndpoints({ apiBasePath: '/test-api' })]
    },
    {
      domain: 'site-4',
      data: {
        dbName: 'testdb',
        baseUrl: 'http://localhost:8080/site-4',
        emailConfig: {
          from: fromEmail,
          password: '',
          name: 'Test Admin',
          emails: {
            registerEmail,
            resetPasswordEmail
          }
        }
      },
      endpoints: [...authenticationEndpoints()]
    }
  ]
}).start({ suppressLog: true });

// Run

describe('1. authenticationEndpoints', () => {
  // return;

  describe('1.1. When "POST /api/register is called', () => {
    // return;

    it('1.1.1. Should create a user with the given body properties and return the "_id"', async () => {
      // return;
      const { body: { data: { _id } } } = await superagent
        .post('http://localhost:8080/site-1/api/register')
        .send({
          email,
          password: pw1,
          repeatPassword: pw1,
          first,
          last
        });
      const record = await User.findOne({ email }).lean();
      expect(record._id.toString()).to.equal(_id);
      expect(record.email).to.equal(email);
      expect(record.first).to.equal(first);
      expect(record.last).to.equal(last);
      await User.deleteOne({ email });
    });

    describe('1.1.2. When data is missing or invalid', () => {
      // return;

      describe('1.1.2.1. When "email" is not given', () => {
        // return;
        it('1.1.2.1.1. Should return a USER_ERROR', async () => {
          const { body: { error: { message } } } = await superagent
            .post('http://localhost:8080/site-1/api/register')
            .send({
              password: pw1,
              repeatPassword: pw1
            });
          expect(message).to.equal('Email is required.');
        });
      });

      describe('1.1.2.2. When "password" is not given', () => {
        // return;
        it('1.1.2.2.1. Should return a USER_ERROR', async () => {
          const { body: { error: { message } } } = await superagent
            .post('http://localhost:8080/site-1/api/register')
            .send({
              email,
              repeatPassword: pw1
            });
          expect(message).to.equal('Password is required.');
        });
      });

      describe('1.1.2.3. When "repeatPassword" is not given', () => {
        // return;
        it('1.1.2.3.1. Should return a USER_ERROR', async () => {
          const { body: { error: { message } } } = await superagent
            .post('http://localhost:8080/site-1/api/register')
            .send({
              email,
              password: pw1
            });
          expect(message).to.equal('Repeat Password is required.');
        });
      });

      describe('1.1.2.4. When "repeatPassword" does not match "password"', () => {
        // return;
        it('1.1.2.4.1. Should return a USER_ERROR', async () => {
          const { body: { error: { message } } } = await superagent
            .post('http://localhost:8080/site-1/api/register')
            .send({
              email,
              password: pw1,
              repeatPassword: pw2
            });
          expect(message).to.equal('Passwords do not match.');
        });
      });

      describe('1.1.2.5. When a user with "email" already exists', () => {
        // return;
        it('1.1.2.5.1. Should return a USER_ERROR', async () => {
          await User.create({ email, password: pw1 });
          const { body: { error: { message } } } = await superagent
            .post('http://localhost:8080/site-1/api/register')
            .send({
              email,
              password: pw1,
              repeatPassword: pw1
            });
          expect(message).to.equal('Registration already exists.');
          await User.deleteOne({ email });
        });
      });

    });

    describe('1.1.3. When "modelName" is given', async () => {
      // return;
      it('1.1.3.1. Should create the user in that collection', async () => {
        const { body: { data: { _id } } } = await superagent
          .post('http://localhost:8080/site-2/api/register')
          .send({
            email,
            password: pw1,
            repeatPassword: pw1,
            first,
            last
          });
        const record = await Person.findOne({ email }).lean();
        expect(record._id.toString()).to.equal(_id);
        await Person.deleteOne({ email });
      });
    });

    describe('1.1.4. When "apiBasePath" is given', async () => {
      // return;
      it('1.1.4.1. Should serve the endpoint on that path', async () => {
        const { body: { data: { _id } } } = await superagent
          .post('http://localhost:8080/site-3/test-api/register')
          .send({
            email,
            password: pw1,
            repeatPassword: pw1,
            first,
            last
          });
        const record = await User.findOne({ email }).lean();
        expect(record._id.toString()).to.equal(_id);
        await User.deleteOne({ email });
      });
    });

    describe('1.1.5. When "emailConfig" is included in the site configuration data', () => {
      it('1.1.5.1. Should send a registration email (manually verified)', async () => {
        return;
        const { body: { message } } = await superagent
          .post('http://localhost:8080/site-4/api/register')
          .send({
            email: fromEmail,
            password: pw1,
            repeatPassword: pw1,
            first,
            last
          });
        expect(message).to.equal('Success');
        await User.deleteOne({ email: fromEmail });
      });
    });

  });

  describe('1.2. When "POST /api/login" is called', () => {
    // return;

    it('1.2.1. Should return the "_id" on successful login', async () => {
      // return;
      const record = await User.create({ email, password: pw1 });
      const { body: { data: { _id } } } = await superagent
        .post('http://localhost:8080/site-1/api/login')
        .send({ email, password: pw1 });
      expect(_id).to.equal(record._id.toString());
      await User.deleteOne({ email });
    });

    describe('1.2.2. When data is missing or invalid', () => {
      // return;

      describe('1.2.2.1. When "email" is not given', () => {
        // return;
        it('1.2.2.1.1. Should return a USER_ERROR', async () => {
          await User.create({ email, password: pw1 });
          const { body: { error: { message } } } = await superagent
            .post('http://localhost:8080/site-1/api/login')
            .send({ password: pw1 });
          expect(message).to.equal('Email is required.');
          await User.deleteOne({ email });
        });
      });

      describe('1.2.2.2. When "password" is not given', () => {
        // return;
        it('1.2.2.2.1. Should return a USER_ERROR', async () => {
          await User.create({ email, password: pw1 });
          const { body: { error: { message } } } = await superagent
            .post('http://localhost:8080/site-1/api/login')
            .send({ email });
          expect(message).to.equal('Password is required.');
          await User.deleteOne({ email });
        });
      });

      describe('1.2.2.3. When "password" is incorrect', () => {
        // return;
        it('1.2.2.3.1. Should return a USER_ERROR', async () => {
          await User.create({ email, password: pw1 });
          const { body: { error: { message } } } = await superagent
            .post('http://localhost:8080/site-1/api/login')
            .send({ email, password: pw2 });
          expect(message).to.equal('Incorrect email or password');
          await User.deleteOne({ email });
        });
      });

      describe('1.2.2.4. When a user with "email" does not exist', () => {
        // return;
        it('1.2.2.4.1. Should return a USER_ERROR', async () => {
          await User.create({ email, password: pw1 });
          const { body: { error: { message } } } = await superagent
            .post('http://localhost:8080/site-1/api/login')
            .send({ email: 'asdf@test.com', password: pw1 });
          expect(message).to.equal('Incorrect email or password');
          await User.deleteOne({ email });
        });
      });

    });

    describe('1.2.3. When "modelName" is given', async () => {
      // return;
      it('1.2.3.1. Should check for the user in that collection', async () => {
        await Person.create({ email, password: pw1 });
        const { body: { data: { _id } } } = await superagent
          .post('http://localhost:8080/site-2/api/login')
          .send({ email, password: pw1 });
        const record = await Person.findOne({ email }).lean();
        expect(record._id.toString()).to.equal(_id);
        await Person.deleteOne({ email });
      });
    });

    describe('1.2.4. When "apiBasePath" is given', async () => {
      // return;
      it('1.2.4.1. Should serve the endpoint on that path', async () => {
        const record = await User.create({ email, password: pw1 });
        const { body: { data: { _id } } } = await superagent
          .post('http://localhost:8080/site-3/test-api/login')
          .send({
            email,
            password: pw1,
            repeatPassword: pw1,
            first,
            last
          });
        expect(record._id.toString()).to.equal(_id);
        await User.deleteOne({ email });
      });
    });

  });

  describe('1.3. When "POST /api/reset-password" is called', () => {
    // return;

    describe('1.3.1. When "POST /api/reset-password/email" is called', () => {
      // return;

      it('1.3.1.1. Should send an email with a reset link (manually verified)', async () => {
        return;
        await User.create({
          email: fromEmail,
          password: pw1,
          first,
          last
        });
        const { body: { message } } = await superagent
          .post('http://localhost:8080/site-4/api/reset-password/email')
          .send({ email: fromEmail });
        expect(message).to.equal('Success');
        await User.deleteOne({ email: fromEmail });
      });

      describe('1.3.1.2. When data is missing or invalid', () => {
        // return;

        describe('1.3.1.2.1 When "email" is not given', () => {
          // return;
          it('1.3.1.2.1.1. Should return a USER_ERROR', async () => {
            const { body: { error: { message } } } = await superagent
              .post('http://localhost:8080/site-4/api/reset-password/email')
              .send({ password: pw1 });
            expect(message).to.equal('Email is required.');
          });
        });

        describe('1.3.1.2.2. When "emailConfig" is not given', () => {
          // return;
          it('1.3.1.2.2.1. Should return a USER_ERROR', async () => {
            const consoleError = console.error;
            let errorMessage;
            console.error = (a, b, c) => errorMessage = c.message;
            try {
              await superagent
                .post('http://localhost:8080/site-1/api/reset-password/email')
                .send({ email, password: pw1 });
            } catch({ status }) {
              console.error = consoleError;
              expect(status).to.equal(500);
              expect(errorMessage).to.equal([
                'SCRIPT_ERROR: "emailConfig" must be passed into the site loader config. ',
                'See https://www.npmjs.com/package/@sempervirens/plugin-authentication-endpoints ',
                'for more information.'
              ].join(''));
              expect(true).to.be.true;
            }
          });
        });

        describe('1.3.1.2.3. When a record does not exist for the given "email"', () => {
          // return;
          it('1.3.1.2.3.1. Should return a USER_ERROR', async () => {
            const { body: { error: { message } } } = await superagent
              .post('http://localhost:8080/site-4/api/reset-password/email')
              .send({ email, password: pw1 });
            expect(message).to.equal('Not registered');
          });
        });

      });

    });

    describe('1.3.2. When "POST /api/reset-password/reset" is called', () => {
      // return;

      it('1.3.2.1. Should reset the password to the given value', async () => {
        // return;
        const record1 = await User.create({ email, password: pw1 });
        const token = authorizer.encrypt({
          expiresIn: '1m',
          data: { _id: record1._id.toString() }
        });
        const { body: { message } } = await superagent
          .post('http://localhost:8080/site-1/api/reset-password/reset')
          .send({
            token,
            password: pw2,
            repeatPassword: pw2
          });
        const record2 = await User.findById(record1._id);
        expect(message).to.equal('Success');
        expect(record2.passwordMatches(pw1)).to.be.false;
        expect(record2.passwordMatches(pw2)).to.be.true;
        await User.deleteOne({ email });
      });

      describe('1.3.2.2. When data is missing or invalid', () => {
        // return;

        describe('1.3.2.2.1. When "token" is not given', () => {
          // return;
          it('1.3.2.2.1.1. Should return a USER_ERROR', async () => {
            const { body: { error: { message } } } = await superagent
              .post('http://localhost:8080/site-1/api/reset-password/reset')
              .send({ password: pw1, repeatPassword: pw1 });
            expect(message).to.equal('Token is required.');
          });
        });

        describe('1.3.2.2.2. When "token" is invalid', () => {
          // return;
          it('1.3.2.2.2.1. Should return a USER_ERROR', async () => {
            const { body: { error: { message } } } = await superagent
              .post('http://localhost:8080/site-1/api/reset-password/reset')
              .send({ token: 'asdf', password: pw1, repeatPassword: pw1 });
            expect(message).to.equal('Token is invalid.');
          });
        });

        describe('1.3.2.2.3. When "password" is not given', () => {
          // return;
          it('1.3.2.2.3.1. Should return a USER_ERROR', async () => {
            const record = await User.create({ email, password: pw1 });
            const token = authorizer.encrypt({
              expiresIn: '1m',
              data: { _id: record._id.toString() }
            });
            const { body: { error: { message } } } = await superagent
              .post('http://localhost:8080/site-1/api/reset-password/reset')
              .send({ token, repeatPassword: pw1 });
            expect(message).to.equal('Password is required.');
            await User.deleteOne({ email });
          });
        });

        describe('1.3.2.2.4. When "repeatPassword" is not given', () => {
          // return;
          it('1.3.2.2.4.1. Should return a USER_ERROR', async () => {
            const record = await User.create({ email, password: pw1 });
            const token = authorizer.encrypt({
              expiresIn: '1m',
              data: { _id: record._id.toString() }
            });
            const { body: { error: { message } } } = await superagent
              .post('http://localhost:8080/site-1/api/reset-password/reset')
              .send({ token, password: pw1 });
            expect(message).to.equal('Repeat Password is required.');
            await User.deleteOne({ email });
          });
        });

        describe('1.3.2.2.5. When "repeatPassword" does not match "password"', () => {
          // return;
          it('1.3.2.2.5.1. Should return a USER_ERROR', async () => {
            const record = await User.create({ email, password: pw1 });
            const token = authorizer.encrypt({
              expiresIn: '1m',
              data: { _id: record._id.toString() }
            });
            const { body: { error: { message } } } = await superagent
              .post('http://localhost:8080/site-1/api/reset-password/reset')
              .send({ token, password: pw1, repeatPassword: pw2 });
            expect(message).to.equal('Passwords do not match.');
            await User.deleteOne({ email });
          });
        });

      });

      describe('1.3.2.3 When "modelName" is given (covers /email and /reset because same endpoint)', async () => {
        // return;
        it('1.3.2.3.1. Should reset the password to the given value in that collection', async () => {
          const record1 = await Person.create({ email, password: pw1 });
          const token = authorizer.encrypt({
            expiresIn: '3m',
            data: { _id: record1._id.toString() }
          });
          const { body: { message } } = await superagent
            .post('http://localhost:8080/site-2/api/reset-password/reset')
            .send({
              token,
              password: pw2,
              repeatPassword: pw2
            });
          const record2 = await Person.findById(record1._id);
          expect(message).to.equal('Success');
          expect(record2.passwordMatches(pw1)).to.be.false;
          expect(record2.passwordMatches(pw2)).to.be.true;
          await Person.deleteOne({ email });
        });
      });

      describe('1.3.2.4. When "apiBasePath" is given (covers /email and /reset because same endpoint)', async () => {
        // return;
        it('1.3.2.4.1. Should serve the endpoint on that path and reset the password', async () => {
          const record1 = await User.create({ email, password: pw1 });
          const token = authorizer.encrypt({
            expiresIn: '1m',
            data: { _id: record1._id.toString() }
          });
          const { body: { message } } = await superagent
            .post('http://localhost:8080/site-3/test-api/reset-password/reset')
            .send({ token, password: pw2, repeatPassword: pw2 });
          const record2 = await User.findById(record1._id);
          expect(message).to.equal('Success');
          expect(record2.passwordMatches(pw1)).to.be.false;
          expect(record2.passwordMatches(pw2)).to.be.true;
          record1.password = pw1;
          await record1.save();
        });
      });

      after(async () => await User.deleteOne({ email }));

    });

  });

  after(async () => {
    await new Promise(resolve => setTimeout(() => resolve(), 500));
    await dao.getDb('testdb').connection.dropDatabase();
    setTimeout(() => process.exit(), 500);
  });

});