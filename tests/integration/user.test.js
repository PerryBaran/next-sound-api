const { expect } = require('chai');
const request = require('supertest');
const { User } = require('../../src/models');
const bcrypt = require('bcrypt');
const { authStub, app } = require('../test-config');
const sinon = require('sinon');

describe('/users', () => {
  let validData;
  
  before(async () => {
    try {
      await User.sequelize.sync({ force: true });
    } catch (err) {
      console.error(err);
    }
  });

  beforeEach(() => {
    validData = {
      name: 'validName',
      email: 'valid@email.com',
      password: 'validPassword',
    };
  })

  afterEach(async () => {
    try {
      await User.destroy({ where: {} });
      sinon.restore();
    } catch (err) {
      console.error(err);
    }
  });

  describe('POST /users/signup', () => {
    it('creates a new user in the database', async () => {
      const { status, body } = await request(app)
        .post('/users/signup')
        .send(validData);
      const newUserRecord = await User.unscoped().findByPk(body.id, {
        raw: true,
      });

      const passwordsMatch = await bcrypt.compare(
        validData.password,
        newUserRecord.password
      );

      expect(status).to.equal(201);
      expect(body.name).to.equal(validData.name);
      expect(body.email).to.equal(validData.email);
      expect(newUserRecord.name).to.equal(validData.name);
      expect(newUserRecord.email).to.equal(validData.email);
      expect(passwordsMatch).to.be.true;
    });

    it('returns 400 if name is empty', async () => {
      validData.name = ''
      const { status, body } = await request(app)
        .post('/users/signup')
        .send(validData);

      expect(status).to.equal(400);
      expect(body.message).to.equal('Name must have a value');
    });

    it('returns 400 if email is empty', async () => {
      validData.email = ''
      const { status, body } = await request(app)
        .post('/users/signup')
        .send(validData);

      expect(status).to.equal(400);
      expect(body.message).to.equal('Email must have a value');
    });

    it('returns 400 if email is not valid', async () => {
      validData.email = 'notValidEmail';
      const { status, body } = await request(app)
        .post('/users/signup')
        .send(validData);

      expect(status).to.equal(400);
      expect(body.message).to.equal('Email must be valid');
    });

    it('returns 400 if password is less than 8 characters', async () => {
      validData.password = '';
      const { status, body } = await request(app)
        .post('/users/signup')
        .send(validData);

      expect(status).to.equal(400);
      expect(body.message).to.equal(
        'Password must be atleast 8 characters long'
      );
    });

    it('returns 409 if a user with that name already exists', async () => {
      await request(app).post('/users/signup').send(validData);

      const validData2 = {
        name: 'validName',
        email: 'valid2@email.com',
        password: 'validPassword',
      };
      const { status, body } = await request(app)
        .post('/users/signup')
        .send(validData2);

      expect(status).to.equal(409);
      expect(body.message).to.equal('Username already taken');
    });

    it('returns 409 if a user with that email already exists', async () => {
      await request(app).post('/users/signup').send(validData);

      const data2 = {
        name: 'validName2',
        email: 'valid@email.com',
        password: 'validPassword',
      };
      const { status, body } = await request(app)
        .post('/users/signup')
        .send(data2);

      expect(status).to.equal(409);
      expect(body.message).to.equal('Authentication failed');
    });
  });

  describe('with records in the database', () => {
    let validData;
    let users;

    beforeEach(async () => {
      try {
        validData = [];
        users = [];
        const data1 = {
          name: 'validName',
          email: 'valid@email.com',
          password: 'validPassword',
        };
        const user1 = await User.create({
          name: data1.name,
          email: data1.email,
          password: await bcrypt.hash(data1.password, 10),
        });
        users.push(user1);
        validData.push(data1);

        const data2 = {
          name: 'validName2',
          email: 'valid2@email.com',
          password: 'validPassword2',
        };
        const user2 = await User.create({
          name: data2.name,
          email: data2.email,
          password: await bcrypt.hash(data2.password, 10),
        });
        validData.push(data2);
        users.push(user2);

        authStub.callsFake((req, _, next) => {
          req.user = { id: user1.id };
          next();
        });
      } catch (err) {
        console.error(err);
      }
    });

    describe('POST /users/login', () => {
      it('logs user in if valid user exists and credentials match', async () => {
        const { status, body } = await request(app)
          .post('/users/login')
          .send(validData[0]);

        expect(status).to.equal(201);
        expect(body.name).to.equal(validData[0].name);
        expect(body.email).to.equal(validData[0].email);
      });

      it("returns 401 if password don't match", async () => {
        validData[0].password = 'differentPassword';
        const { status, body } = await request(app)
          .post('/users/login')
          .send(validData[0]);

        expect(status).to.equal(401);
        expect(body.message).to.equal('Authentication failed');
      });

      it("returns 401 if the email doesn't exist", async () => {
        delete validData[0].email;

        const { status, body } = await request(app)
          .post('/users/login')
          .send(validData[0]);

        expect(status).to.equal(401);
        expect(body.message).to.equal('Authentication failed');
      });
    });

    describe('GET /users', () => {
      it('returns all users in the database', async () => {
        const { status, body } = await request(app).get('/users');

        expect(status).to.equal(200);
        expect(body.length).to.equal(validData.length);
        body.forEach((user) => {
          const expected = validData.find((item) => item.name === user.name);

          expect(user.email).to.equal(expected.email);
        });
      });

      it('returns queried user by name', async () => {
        const user = users[1];
        const { status, body } = await request(app).get(
          `/users?name=${user.name}`
        );

        expect(status).to.equal(200);
        expect(body.length).to.equal(1);
        expect(body[0].id).to.equal(user.id);
      });

      it('returns all queried users that match name', async () => {
        const { status, body } = await request(app).get(
          `/users?name=validName`
        );

        expect(status).to.equal(200);
        expect(body.length).to.equal(2);
      });

      it('return exact name match if exact is true', async () => {
        const { status, body } = await request(app).get(
          `/users?name=validName&exact=true`
        );

        expect(status).to.equal(200);
        expect(body.length).to.equal(1);
        expect(body[0].id).to.equal(users[0].id);
      });

      it('returns limited results by query', async () => {
        const { status, body } = await request(app).get('/users?limit=1');

        expect(status).to.equal(200);
        expect(body.length).to.equal(1);
      });
    });

    describe('/users/:userId', () => {
      describe('GET /users/:userId', () => {
        it('gets the user with the specified id', async () => {
          const user = users[0];
          const { status, body } = await request(app).get(`/users/${user.id}`);

          expect(status).to.equal(200);
          expect(body.name).to.equal(user.name);
          expect(body.email).to.equal(user.email);
          expect(body.password).to.be.undefined;
        });

        it('returns 404 if no user exists with the specified id', async () => {
          const { status, body } = await request(app).get(
            '/users/bf65bf17-10ed-43b8-8f05-15a85648fdc9'
          );

          expect(status).to.equal(404);
          expect(body.message).to.equal('The user could not be found.');
        });
      });

      describe('PATCH /users/:userId', () => {
        it('updates user by id', async () => {
          const user = users[0];
          const newName = 'newName';
          const { status } = await request(app)
            .patch(`/users/${user.id}`)
            .send({
              name: newName,
            });

          const updatedUserRecord = await User.findByPk(user.id, {
            raw: true,
          });

          expect(status).to.equal(200);
          expect(updatedUserRecord.name).to.equal(newName);
          expect(updatedUserRecord.email).to.equal(user.email);
        });

        it("returns 401 if the userId doesn't match to user.id (from token authentication)", async () => {
          const newName = 'newName';
          const { status, body } = await request(app)
            .patch(`/users/${users[1].id}`)
            .send({
              name: newName,
            });

          expect(status).to.equal(401);
          expect(body.message).to.equal('Invalid Credentials');
        });

        it("returns 404 if the user doesn't exist", async () => {
          const id = 'bf65bf17-10ed-43b8-8f05-15a85648fdc9';
          authStub.callsFake((req, _, next) => {
            req.user = { id: id };
            next();
          });
          const { status, body } = await request(app)
            .patch(`/users/${id}`)
            .send({
              name: 'newName',
            });

          expect(status).to.equal(404);
          expect(body.message).to.equal('The user could not be found.');
        });
      });
    });

    describe('DELETE /users/:userId/:password', () => {
      it('deletes user by id', async () => {
        const user = users[0];
        const userData = validData[0];
        const { status } = await request(app).delete(
          `/users/${user.id}/${userData.password}`
        );

        const newUsersRecord = await User.findAll();

        expect(status).to.equal(204);
        expect(newUsersRecord.length).to.equal(validData.length - 1);
        expect(newUsersRecord[0].id).to.not.equal(user.id);
      });

      it("returns 401 if the userId doesn't match to user.id (from token authentication)", async () => {
        const user = users[1];
        const userData = validData[1];
        const { status, body } = await request(app).delete(
          `/users/${user.id}/${userData.password}`
        );

        expect(status).to.equal(401);
        expect(body.message).to.equal('Invalid Credentials');
      });

      it("returns 404 if the user doesn't exist", async () => {
        const id = 'bf65bf17-10ed-43b8-8f05-15a85648fdc9';
        authStub.callsFake((req, _, next) => {
          req.user = { id: id };
          next();
        });
        const { status, body } = await request(app).delete(
          `/users/${id}/fakePassword`
        );

        expect(status).to.equal(404);
        expect(body.message).to.equal('The User could not be found.');
      });

      it("returns 401 if the password doesn't match the users password", async () => {
        const user = users[0];
        const { status, body } = await request(app).delete(
          `/users/${user.id}/wrongPassword`
        );

        expect(status).to.equal(401);
        expect(body.message).to.equal('Invalid Credentials');
      });
    });
  });
});
