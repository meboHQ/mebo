const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const Mebo = require('../../../src');
const testutils = require('../../../testutils');

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line
const passport = require('passport'); // eslint-disable-line
const BasicStrategy = require('passport-http').BasicStrategy; // eslint-disable-line


describe('Web Stream:', () => {

  let server = null;
  let app = null;
  let port = null;
  const testDataImagePath = path.join(__dirname, '../../../testutils/data/image.png');

  before((done) => {

    Mebo.Action.register(testutils.Actions.Shared.StreamOutput, 'streamOutput');

    // webfying actions
    Mebo.Handler.grantAction('web', 'streamOutput', {restRoute: '/A/streamTest'});

    // express server
    app = express();
    app.use(passport.initialize());
    server = app.listen(0, () => {
      done();
    });

    Mebo.Handler.get('web').restful(app);
    port = server.address().port;
  });

  after(() => {
    if (server){
      server.close();
    }
  });

  it('Should perform an action through rest that returns a stream (text)', (done) => {

    request(`http://localhost:${port}/A/streamTest?type=text`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        assert.equal(body.toString('utf8'), 'test');
        assert.equal(response.headers['content-type'], 'text/plain');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through rest that returns a stream (binary)', (done) => {
    request({
      url: `http://localhost:${port}/A/streamTest?type=binary&file=${testDataImagePath}`,
      encoding: null,
    }, (err, response, body) => {
      (async () => {

        // querying the checksum from the test image file
        const checksumAction = Mebo.Action.create('file.checksum');
        checksumAction.input('file').setValue(testDataImagePath);
        const testImageFileChecksum = await checksumAction.run();

        if (err){
          throw err;
        }

        assert.equal(response.statusCode, 200);
        const streamChecksum = crypto.createHash('sha256').update(body).digest('hex');

        assert.equal(streamChecksum, testImageFileChecksum);
        assert.equal(response.headers['content-type'], 'application/octet-stream');

      })().then((result) => {
        done();
      }).catch((error) => {
        done(error);
      });
    });
  });
});
