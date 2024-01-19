const { expect } = require('chai');
const request = require('supertest');
const { Song, Album, User } = require('../../src/models');
const sinon = require('sinon');
const { authStub, app } = require('../test-config');

describe('/songs', () => {
  let user;
  let album;
  let validData;

  before(async () => {
    try {
      await User.sequelize.sync({ force: true });
      await Album.sequelize.sync({ force: true });
      await Song.sequelize.sync({ force: true });
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

      const fakeAlbumData = {
        name: 'validName',
        url: `${user.id}/25d8f83b-d25d-4664-8f2f-5986a6430712`,
        UserId: user.id,
      };
      album = await Album.create(fakeAlbumData);

      validData = {
        name: 'validName',
        position: 0,
        url: `${user.id}/${album.id}/0640bd8f-01e9-4cf4-87cc-8f5cff5d11cb`,
        AlbumId: album.id,
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
      await Song.destroy({ where: {} });
    } catch (err) {
      console.error(err);
    }
  });

  describe('POST /songs', () => {
    it('creates a new song in the database', async () => {
      const { status, body } = await request(app)
        .post('/songs')
        .send(validData)
      const newSongRecord = await Song.findByPk(body.id, {
        raw: true,
      });

      expect(status).to.equal(200);
      expect(body.name).to.equal(validData.name);
      expect(body.AlbumId).to.equal(validData.AlbumId);
      expect(body.position).to.equal(validData.position);
      expect(body.url).to.equal(validData.url);
      expect(newSongRecord.name).to.equal(body.name);
    });

    it("returns 404 if AlbumId doesn't match a song of a valid User", async () => {
      validData.AlbumId = 'aa31b7c4-7784-423e-8263-4d3ab6109990'
      
      const { status, body } = await request(app)
        .post('/songs')
        .send(validData)

      expect(status).to.equal(500);
      expect(body.message).to.equal(
        'Error: insert or update on table "Songs" violates foreign key constraint "Songs_AlbumId_fkey"'
      );
    });

    it('returns 500 if name is undefined', async () => {
      validData.name = undefined;
      
      const { status, body } = await request(app)
        .post('/songs')
        .send(validData)

      expect(status).to.equal(500);
      expect(body.message).to.equal(
        'Error: notNull Violation: Must provide a song name'
      );
    })

    it('returns 500 if name is empty', async () => {
      validData.name = '';
      
      const { status, body } = await request(app)
        .post('/songs')
        .send(validData)

      expect(status).to.equal(500);
      expect(body.message).to.equal(
        'Error: Validation error: The song name cannot be empty'
      );
    })

    it('returns 500 if position is undefined', async () => {
      validData.position = undefined;
      
      const { status, body } = await request(app)
        .post('/songs')
        .send(validData)

      expect(status).to.equal(500);
      expect(body.message).to.equal(
        'Error: notNull Violation: Must provide a song position'
      );
    })

    it('returns 500 if position is empty', async () => {
      validData.position = '';
      
      const { status, body } = await request(app)
        .post('/songs')
        .send(validData)

      expect(status).to.equal(500);
      expect(body.message).to.equal(
        'Error: Validation error: The position cannot be empty'
      );
    })


    it('works if url is undefined', async () => {
      validData.url = undefined;

      const { status } = await request(app).post('/songs').send(validData);

      expect(status).to.equal(200);
    });
  });

  describe('with records in the database', () => {
    let songs;

    beforeEach(async () => {
      songs = await Promise.all([
        Song.create({
          name: 'fakeName1',
          AlbumId: album.id,
          url: ``,
          position: 0,
        }),
        Song.create({
          name: 'fakeName2',
          AlbumId: album.id,
          url: ``,
          position: 1,
        }),
      ]);
    });

    describe('GET /songs', () => {
      it('returns all songs in the database', async () => {
        const { status, body } = await request(app).get('/songs');

        expect(status).to.equal(200);
        expect(body.length).to.equal(songs.length);
        body.forEach((song) => {
          const expected = songs.find((item) => item.name === song.name);

          expect(song.id).to.equal(expected.id);
        });
      });

      it('returns queried song by name', async () => {
        const song = songs[0];
        const { status, body } = await request(app).get(
          `/songs?name=${song.name}`
        );

        expect(status).to.equal(200);
        expect(body.length).to.equal(1);
        expect(body[0].id).to.equal(song.id);
      });

      it('returns limited results by query', async () => {
        const { status, body } = await request(app).get('/songs?limit=1');

        expect(status).to.equal(200);
        expect(body.length).to.equal(1);
      });
    });

    describe('/songs/:songId', () => {
      describe('GET /songs/:songId', () => {
        it('gets the song with the specified id', async () => {
          const song = songs[0];
          const { status, body } = await request(app).get(`/songs/${song.id}`);

          expect(status).to.equal(200);
          expect(body.name).to.equal(song.name);
          expect(body.url).to.equal(song.url);
        });

        it('returns 404 if no song exists with the specified id', async () => {
          const { status, body } = await request(app).get('/songs/c89f9fac-7f9a-4c30-9349-2be810023589');

          expect(status).to.equal(404);
          expect(body.message).to.equal('The song could not be found.');
        });
      });

      describe('PATCH /songs/:songId', () => {
        it('edits song with specified id', async () => {
          const newData = { name: 'newName' };
          const song = songs[0];
          const { status } = await request(app)
            .patch(`/songs/${song.id}`)
            .send(newData)
          const updatedSongRecord = await Song.findByPk(song.id, {
            raw: true,
          });

          expect(status).to.equal(200);
          expect(updatedSongRecord.name).to.equal(newData.name);
        });

        it('returns 404 if no song exists with the specified id', async () => {
          const newData = { name: 'newName' };
          const { status, body } = await request(app)
            .patch('/songs/c89f9fac-7f9a-4c30-9349-2be810023589')
            .send(newData)

          expect(status).to.equal(404);
          expect(body.message).to.equal('The song could not be found');
        });
      });

      describe('DELETE /songs/:songId', () => {
        it('deletes song with specified id', async () => {
          const { id } = songs[0];
          const { status } = await request(app).delete(`/songs/${id}`);
          const deletedSongRecord = await Song.findByPk(id, {
            raw: true,
          });

          expect(status).to.equal(204);
          expect(deletedSongRecord).to.be.null;
        });

        it('returns 404 if no song exists with the specified id', async () => {
          const { status } = await request(app).delete('/songs/c89f9fac-7f9a-4c30-9349-2be810023589');

          expect(status).to.equal(404);
        });
      });
    });
  });
});