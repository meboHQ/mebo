const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const express = require('express'); // eslint-disable-line
const Mebo = require('../../src');

const Input = Mebo.Input;


describe('Url Input:', () => {

  let server = null;
  let port = null;
  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'urlInputTest'));
  const smallFile = 'small.foo';
  const largeFile = 'large.foo';

  before((done) => {

    // creating temporary files that will be used by the tests bellow (they get
    // removed automatically by the tmp library)
    fs.writeFileSync(path.join(temporaryFolder, smallFile), Array(1 * 1024 * 1024).join('0'));
    fs.writeFileSync(path.join(temporaryFolder, largeFile), Array(10 * 1024 * 1024).join('0'));

    const app = express();
    app.use('/', express.static(temporaryFolder));

    server = app.listen(0, () => {
      done();
    });

    port = server.address().port;
  });

  after(() => {
    fs.unlinkSync(path.join(temporaryFolder, smallFile));
    fs.unlinkSync(path.join(temporaryFolder, largeFile));
    fs.rmdirSync(temporaryFolder);
    if (server){
      server.close();
    }
  });

  it('Input should start empty', () => {
    const input = Input.create('input: url');
    assert.equal(input.value(), null);
  });

  it('Should match the extension', () => {

    const input = Input.create('input: url');
    input.setValue('http://domain.com/foo/item.ext?arg=1&arg2=2');

    assert.equal(input.extension(), 'ext');
  });

  it('Should match the protocol', () => {

    const input = Input.create('input: url');
    input.setValue('http://domain.com/foo/item.ext?arg=1&arg2=2');

    assert.equal(input.protocol(), 'http:');
  });

  it('Should fail when url does not exist', (done) => {

    (async () => {

      const input = Input.create('input: url', {exists: true});
      input.setValue(`http://localhost:${port}/wrongItem.foo`);
      await input.validate();

    })().then((result) => {
      done(new Error('unexpected value'));

    }).catch((err) => {
      done();
    });
  });

  it('Should fail when using a invalid protocol', (done) => {

    (async () => {

      const input = Input.create('input: url', {exists: true});
      input.setValue(`ftp://localhost:${port}/wrongItem.foo`);

      await input.validate();

    })().then((result) => {
      done(new Error('unexpected value'));

    }).catch((err) => {
      done();
    });
  });

  it('Should fail when url does not exist and the property exists is false', () => {

    return (async () => {

      const input = Input.create('input: url', {exists: false});
      input.setValue(`http://localhost:${port}/wrongItem.foo`);
      await input.validate();

    })();
  });

  it('Should test protocol of a vector input', () => {

    const input = Input.create('input: url[]', {exists: true});
    input.setValue([`http://localhost:${port}/${smallFile}`, null]);

    assert.equal(input.protocol(0), 'http:');
    assert.equal(input.protocol(1), '');
  });

  it('Should test extension of a vector input', () => {

    const input = Input.create('input: url[]', {exists: true});
    input.setValue([`http://localhost:${port}/${smallFile}`, null]);

    assert.equal(input.extension(0), 'foo');
    assert.equal(input.extension(1), '');
  });

  it('Should test the cache for the headers (success)', () => {

    return (async () => {

      const input = Input.create('input: url', {exists: true});
      input.setValue(`http://localhost:${port}/${smallFile}`);
      await input.headers();
      server.close();

      await input.headers();
      server.listen(port);

    })();
  });

  it('Should test a request error', (done) => {

    (async () => {

      const input = Input.create('input: url', {exists: true});
      input.setValue(`http://localhost:${port}/_invalidURL_`);
      await input.headers();

    })().then((result) => {
      done(new Error('Unexpected result'));

    }).catch((err) => {
      done(err.message === 'Could not connect to the url' ? null : err);
    });
  });

  it('Should not fail when url exists', () => {

    return (async () => {

      const input = Input.create('input: url', {exists: true});
      input.setValue(`http://localhost:${port}/${smallFile}`);
      await input.validate();

    })();
  });

  it('Should not fail when file is smaller than the maximum size allowed', () => {

    return (async () => {

      const input = Input.create('input: url', {maxContentSize: 5 * 1024 * 1024});
      input.setValue(`http://localhost:${port}/${smallFile}`);
      await input.validate();

    })();
  });

  it('Should fail when file is larger than the maximum size allowed', (done) => {

    (async () => {

      const input = Input.create('input: url', {maxContentSize: 5 * 1024 * 1024});
      input.setValue(`http://localhost:${port}/${largeFile}`);
      await input.validate();

    })().then((result) => {
      done(new Error('Unexpected result'));

    }).catch((err) => {
      done();
    });
  });

  it('Should fail when file extension is not under the allowed extensions', (done) => {

    (async () => {

      const input = Input.create('input: url', {allowedExtensions: ['jpg', 'png']});
      input.setValue(`http://localhost:${port}/${smallFile}`);
      await input.validate();

    })().then((result) => {
      done(new Error('Unexpected result'));

    }).catch((err) => {
      done();
    });
  });

  it('Should not fail when file extension is under the allowed extensions', () => {

    return (async () => {

      const input = Input.create('input: url', {allowedExtensions: ['foo', 'png']});
      input.setValue(`http://localhost:${port}/${smallFile}`);
      await input.validate();

    })();
  });
});
