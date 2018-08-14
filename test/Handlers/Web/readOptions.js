// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line
// regular modules
const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const path = require('path');
const Mebo = require('../../../src');
const testutils = require('../../../testutils');

const Settings = Mebo.Settings;

describe('Web Read Options:', () => {

  let server = null;
  let app = null;
  let port = null;

  const customUploadDirectory = path.join(Settings.get('reader/webRequest/uploadDirectory'), uuid.v1());

  class UploadTestFolder extends testutils.Actions.Shared.UploadAction{
    constructor(){
      super();
      this.createInput('folder: text');

      this.setMeta('handler.web.readOptions', {
        uploadDirectory: customUploadDirectory,
      });
    }

    _perform(data){

      if (!data.file.startsWith(`${data.folder}${path.sep}`)){
        return Promise.reject(new Error('Wrong Folder'));
      }

      return super._perform(data);
    }
  }

  const preserveFileNameOptions = {
    readOptions: {
      uploadPreserveName: false,
    },
  };

  class UploadPreserveName extends testutils.Actions.Shared.UploadAction{
    constructor(){
      super();

      this.setMeta('handler.web', preserveFileNameOptions);
    }
  }

  class UploadVectorPreserveFileName extends testutils.Actions.Shared.VectorUploadAction{
    constructor(){
      super();

      this.setMeta('handler.web', preserveFileNameOptions);
    }
  }

  before((done) => {

    // registrations
    Mebo.Action.register(UploadPreserveName, 'uploadAction');
    Mebo.Action.register(UploadVectorPreserveFileName, 'vectorUploadAction');
    Mebo.Action.register(UploadTestFolder, 'uploadTestFolder');

    // webfying actions
    Mebo.Handler.grantAction('web', 'uploadTestFolder', {method: 'put', restRoute: '/uploadTestFolder'});
    Mebo.Handler.grantAction('web', 'uploadAction', {method: 'post', restRoute: '/E'});
    Mebo.Handler.grantAction('web', 'vectorUploadAction', {method: 'post', restRoute: '/E/VectorUploadAction'});

    // express server
    app = express();
    server = app.listen(0, () => {
      done();
    });

    Mebo.Handler.get('web').restful(app);

    port = server.address().port;
  });

  after(() => {

    try{
      fs.rmdirSync(customUploadDirectory);
    }
    catch(err){
      if (!(['ENOTEMPTY', 'ENOENT'].includes(err.code))){
        throw err;
      }
    }

    if (server){
      server.close();
    }
  });

  it('Should perform an action through POST with single file upload (not keeping the original name)', (done) => {

    const postFormData = {
      a: 'A value',

      file: {
        value: Buffer.from([1, 2, 3]),
        options: {
          filename: 'foo.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.post({url: `http://localhost:${port}/E`, formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);

        assert.equal(result.data.fileHash, '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
        assert(result.data.fileName.startsWith('upload_'));
        assert.equal(result.data.a, postFormData.a);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through POST by uploading multiple files for the same input (vector) and not keeping the original names', (done) => {

    const postFormData = {
      // Pass a simple key-value pair
      a: 'A value',
      file: [
        {
          value: Buffer.from([1, 2, 3]),
          options: {
            filename: 'foo.bin',
            contentType: 'application/bin',
          },
        },
        {
          value: Buffer.from([1, 2]),
          options: {
            filename: 'foo1.bin',
            contentType: 'application/bin',
          },
        },
        {
          value: Buffer.from([1, 2, 4]),
          options: {
            filename: 'foo2.bin',
            contentType: 'application/bin',
          },
        },
      ],
    };

    request.post({url: `http://localhost:${port}/E/VectorUploadAction`, formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, postFormData.a);

        // can't guarantee the order of the uploaded files
        const hashes = [
          '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81',
          'a12871fee210fb8619291eaea194581cbd2531e4b23759d225f6806923f63222',
          'd4b29a968c40173638ded8d174c86957afa211be479cee020dba5dfe127d91ca',
        ];

        let foundCount = 0;
        for (const baseName in result.data){
          if (baseName !== 'a'){
            foundCount++;
            assert(baseName.startsWith('upload_'), `Wrong prefix: ${baseName} (expected: upload_)!`);
            assert(hashes.includes(result.data[baseName]), `Wrong hash: ${result.data[baseName]}`);
          }
        }
        assert.equal(foundCount, 3);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action using a custom upload folder through PUT', (done) => {

    const postFormData = {
      // Pass a simple key-value pair
      a: 'A value',
      folder: customUploadDirectory,

      file: {
        value: Buffer.from([1, 2]),
        options: {
          filename: 'foo.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.put({url: `http://localhost:${port}/uploadTestFolder`, formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.fileHash, 'a12871fee210fb8619291eaea194581cbd2531e4b23759d225f6806923f63222');
        assert.equal(result.data.a, postFormData.a);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
