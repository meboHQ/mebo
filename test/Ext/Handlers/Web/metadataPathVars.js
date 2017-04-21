const assert = require('assert');
const Mebo = require('../../../../src');

const Metadata = Mebo.Metadata;


describe('Web metadata path vars:', () => {

  it('Should test $web var', () => {
    assert.equal(
      Metadata.pathVar('$web'),
      'handler.web',
    );
  });

  it('Should test $webUploadDirectory var', () => {
    assert.equal(
      Metadata.pathVar('$webUploadDirectory'),
      'handler.web.readOptions.uploadDirectory',
    );
  });

  it('Should test $webUploadPreserveName var', () => {
    assert.equal(
      Metadata.pathVar('$webUploadPreserveName'),
      'handler.web.readOptions.uploadPreserveName',
    );
  });

  it('Should test $webUploadMaxFileSize var', () => {
    assert.equal(
      Metadata.pathVar('$webUploadMaxFileSize'),
      'handler.web.readOptions.uploadMaxFileSize',
    );
  });

  it('Should test $webMaxFields var', () => {
    assert.equal(
      Metadata.pathVar('$webMaxFields'),
      'handler.web.readOptions.maxFields',
    );
  });

  it('Should test $webMaxFieldsSize var', () => {
    assert.equal(
      Metadata.pathVar('$webMaxFieldsSize'),
      'handler.web.readOptions.maxFieldsSize',
    );
  });

  it('Should test $webHeaders var', () => {
    assert.equal(
      Metadata.pathVar('$webHeaders'),
      'handler.web.writeOptions.headers',
    );
  });

  it('Should test $webHeadersOnly var', () => {
    assert.equal(
      Metadata.pathVar('$webHeadersOnly'),
      'handler.web.writeOptions.headersOnly',
    );
  });

  it('Should test $webResult var', () => {
    assert.equal(
      Metadata.pathVar('$webResult'),
      'handler.web.writeOptions.result',
    );
  });


  it('Should test $webRoot var', () => {
    assert.equal(
      Metadata.pathVar('$webRoot'),
      'handler.web.writeOptions.root',
    );
  });

  it('Should test $webSuccessStatus var', () => {
    assert.equal(
      Metadata.pathVar('$webSuccessStatus'),
      'handler.web.writeOptions.successStatus',
    );
  });

  it('Should test $webResultLabel var', () => {
    assert.equal(
      Metadata.pathVar('$webResultLabel'),
      'handler.web.writeOptions.resultLabel',
    );
  });
});
