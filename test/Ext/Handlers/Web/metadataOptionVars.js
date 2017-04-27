const assert = require('assert');
const Mebo = require('../../../../src');

const Metadata = Mebo.Metadata;


describe('Web metadata option vars:', () => {

  it('Should test $web var', () => {
    assert.equal(
      Metadata.optionVar('$web'),
      'handler.web',
    );
  });

  it('Should test $webUploadDirectory var', () => {
    assert.equal(
      Metadata.optionVar('$webUploadDirectory'),
      'handler.web.readOptions.uploadDirectory',
    );
  });

  it('Should test $webUploadPreserveName var', () => {
    assert.equal(
      Metadata.optionVar('$webUploadPreserveName'),
      'handler.web.readOptions.uploadPreserveName',
    );
  });

  it('Should test $webUploadMaxFileSize var', () => {
    assert.equal(
      Metadata.optionVar('$webUploadMaxFileSize'),
      'handler.web.readOptions.uploadMaxFileSize',
    );
  });

  it('Should test $webMaxFields var', () => {
    assert.equal(
      Metadata.optionVar('$webMaxFields'),
      'handler.web.readOptions.maxFields',
    );
  });

  it('Should test $webMaxFieldsSize var', () => {
    assert.equal(
      Metadata.optionVar('$webMaxFieldsSize'),
      'handler.web.readOptions.maxFieldsSize',
    );
  });

  it('Should test $webHeaders var', () => {
    assert.equal(
      Metadata.optionVar('$webHeaders'),
      'handler.web.writeOptions.headers',
    );
  });

  it('Should test $webHeadersOnly var', () => {
    assert.equal(
      Metadata.optionVar('$webHeadersOnly'),
      'handler.web.writeOptions.headersOnly',
    );
  });

  it('Should test $webResult var', () => {
    assert.equal(
      Metadata.optionVar('$webResult'),
      'handler.web.writeOptions.result',
    );
  });


  it('Should test $webRoot var', () => {
    assert.equal(
      Metadata.optionVar('$webRoot'),
      'handler.web.writeOptions.root',
    );
  });

  it('Should test $webStatus var', () => {
    assert.equal(
      Metadata.optionVar('$webStatus'),
      'handler.web.writeOptions.status',
    );
  });

  it('Should test $webResultLabel var', () => {
    assert.equal(
      Metadata.optionVar('$webResultLabel'),
      'handler.web.writeOptions.resultLabel',
    );
  });
});
