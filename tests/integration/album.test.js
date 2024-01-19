const { expect } = require('chai');
const request = require('supertest');
const { Album, User } = require('../../src/models');
const sinon = require('sinon');
const { authStub, app } = require('../test-config');

describe('/albums', () => {
  let user;
  let validData;

  before(async () => {
    try {
      await User.sequelize.sync({ force: true });
      await Album.sequelize.sync({ force: true });
    } catch (err) {
      console.error(err);
    }
  });

  beforeEach(async () => {
    try {
      const fakeUserData = {
        name: 'validName',
        email: 'valid@email.com',
        password: 'validPassword',
      };
      user = await User.create(fakeUserData);
      validData = {
        name: 'validName',
        url: `url.com/${user.id}/bf65bf17-10ed-43b8-8f05-15a85648fdc9`,
        UserId: user.id,
      };

      authStub.callsFake((req, _, next) => {
        req.user = { id: user.id };
        next();
      });
    } catch (err) {
      console.error(err);
    }
  });

  afterEach(async () => {
    sinon.restore();
    try {
      await User.destroy({ where: {} });
      await Album.destroy({ where: {} });
    } catch (err) {
      console.error(err);
    }
  });

  describe('POST /albums', () => {
    it('creates a new album in the database', async () => {
      const { status, body } = await request(app)
        .post('/albums')
        .send(validData);
      const newAlbumRecord = await Album.findByPk(body.id, {
        raw: true,
      });

      expect(status).to.equal(200);
      expect(body.name).to.equal(validData.name);
      expect(body.UserId).to.equal(validData.UserId);
      expect(body.url).to.equal(validData.url);
      expect(newAlbumRecord.name).to.equal(body.name);
    });

    it('returns specific error message if name is undefined', async () => {
      validData.name = undefined;

      const { status, body } = await request(app)
        .post('/albums')
        .send(validData);

      expect(status).to.equal(500);
      expect(body.message).to.equal(
        'Error: notNull Violation: Must provide an album name'
      );
    });

    it('returns specific error message if name is undefined', async () => {
      validData.name = undefined;

      const { status, body } = await request(app)
        .post('/albums')
        .send(validData);

      expect(status).to.equal(500);
      expect(body.message).to.equal(
        'Error: notNull Violation: Must provide an album name'
      );
    });

    it('returns specific error message if name is empty', async () => {
      validData.name = '';

      const { status, body } = await request(app)
        .post('/albums')
        .send(validData);

      expect(status).to.equal(500);
      expect(body.message).to.equal(
        'Error: Validation error: The album name cannot be empty'
      );
    });

    it('works if url is undefined', async () => {
      validData.url = undefined;

      const { status } = await request(app).post('/albums').send(validData);

      expect(status).to.equal(200);
    });
  });

  describe('with records in the database', () => {
    let albums;

    beforeEach(async () => {
      albums = await Promise.all([
        Album.create({
          name: 'fakeName1',
          UserId: user.id,
          url: `url.com/${user.id}/792f65e5-fe0b-471b-ab95-db13e9dcde62`,
        }),
        Album.create({
          name: 'fakeName2',
          UserId: user.id,
          url: `url.com/${user.id}/5f5bc541-0442-4972-96a3-d9d80579bc6e`,
        }),
      ]);
    });

    describe('GET /albums', () => {
      it('returns all albums in the database', async () => {
        const { status, body } = await request(app).get('/albums');

        expect(status).to.equal(200);
        expect(body.length).to.equal(albums.length);
        body.forEach((album) => {
          const expected = albums.find((item) => item.name === album.name);

          expect(album.id).to.equal(expected.id);
        });
      });

      it('returns queried album by name', async () => {
        const album = albums[0];
        const { status, body } = await request(app).get(
          `/albums?name=${album.name}`
        );

        expect(status).to.equal(200);
        expect(body.length).to.equal(1);
        expect(body[0].id).to.equal(album.id);
      });

      it('returns limited results by query', async () => {
        const { status, body } = await request(app).get('/albums?limit=1');

        expect(status).to.equal(200);
        expect(body.length).to.equal(1);
      });
    });

    describe('/albums/:albumId', () => {
      describe('GET /albums/:albumId', () => {
        it('gets the album with the specified id', async () => {
          const album = albums[0];
          const { status, body } = await request(app).get(
            `/albums/${album.id}`
          );

          expect(status).to.equal(200);
          expect(body.name).to.equal(album.name);
          expect(body.url).to.equal(album.url);
        });

        it('returns 404 if no album exists with the specified id', async () => {
          const { status, body } = await request(app).get(
            '/albums/d0a0d541-25ec-4f50-b899-f04b9d5df7f9'
          );

          expect(status).to.equal(404);
          expect(body.message).to.equal('The album could not be found.');
        });
      });

      describe('PATCH /albums/:albumId', () => {
        it('edits album with specified id', async () => {
          const newData = { name: 'newName' };
          const album = albums[0];
          const { status } = await request(app)
            .patch(`/albums/${album.id}`)
            .send(newData);
          const updatedAlbumRecord = await Album.findByPk(album.id, {
            raw: true,
          });

          expect(status).to.equal(200);
          expect(updatedAlbumRecord.name).to.equal(newData.name);
        });

        it('returns 404 if no album exists with the specified id', async () => {
          const newData = { name: 'newName' };
          const { status, body } = await request(app)
            .patch('/albums/d0a0d541-25ec-4f50-b899-f04b9d5df7f9')
            .send(newData);

          expect(status).to.equal(404);
          expect(body.message).to.equal('The album could not be found');
        });
      });

      describe('DELETE /albums/:albumId', () => {
        it('deletes album with specified id', async () => {
          const { id } = albums[0];
          const { status } = await request(app).delete(`/albums/${id}`);
          const deletedAlbumRecord = await Album.findByPk(id, {
            raw: true,
          });

          expect(status).to.equal(204);
          expect(deletedAlbumRecord).to.be.null;
        });

        it('returns 404 if no album exists with the specified id', async () => {
          const { status } = await request(app).delete(
            '/albums/d0a0d541-25ec-4f50-b899-f04b9d5df7f9'
          );

          expect(status).to.equal(404);
        });
      });
    });
  });
});
