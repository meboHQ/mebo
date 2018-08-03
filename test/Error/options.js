const assert = require('assert');
const Mebo = require('../../src');

const ValidationFail = Mebo.Errors.ValidationFail;
const Conflict = Mebo.Errors.Conflict;
const NoContent = Mebo.Errors.NoContent;
const NotFound = Mebo.Errors.NotFound;


describe('Error options:', () => {

  it('ValidationFail should have the status code defined by the settings', () => {
    const error = new ValidationFail('Some Message');
    assert.equal(error.status, 400);
    assert.equal(error.status, Mebo.Settings.get('error/validationFail/status'));
  });

  it('Conflict should have the status code defined by the settings', () => {
    const error = new Conflict('Some Message');
    assert.equal(error.status, 409);
    assert.equal(error.status, Mebo.Settings.get('error/conflict/status'));
  });

  it('NoContent should have the status code defined by the settings', () => {
    const error = new NoContent('Some Message');
    assert.equal(error.status, 204);
    assert.equal(error.status, Mebo.Settings.get('error/noContent/status'));
  });

  it('NotFound should have the status code defined by the settings', () => {
    const error = new NotFound('Some Message');
    assert.equal(error.status, 404);
    assert.equal(error.status, Mebo.Settings.get('error/notFound/status'));
  });

  it('ValidationFail should not be allowed as output inside of nested actions', () => {
    const error = new ValidationFail('Some Message');
    assert.equal(error.disableOutputInNested, true);
    assert.equal(error.disableOutputInNested, Mebo.Settings.get('error/validationFail/disableOutputInNested'));
  });

  it('Conflict should be allowed as output inside of nested actions', () => {
    const error = new Conflict('Some Message');
    assert.equal(error.disableOutputInNested, false);
    assert.equal(error.disableOutputInNested, Mebo.Settings.get('error/conflict/disableOutputInNested'));
  });

  it('NotFound should be allowed as output inside of nested actions', () => {
    const error = new NotFound('Some Message');
    assert.equal(error.disableOutputInNested, false);
    assert.equal(error.disableOutputInNested, Mebo.Settings.get('error/notFound/disableOutputInNested'));
  });

  it('NoContent should be allowed as output inside of nested actions', () => {
    const error = new NoContent('Some Message');
    assert.equal(error.disableOutputInNested, false);
    assert.equal(error.disableOutputInNested, Mebo.Settings.get('error/noContent/disableOutputInNested'));
  });

  it('Conflict should have a default message', () => {
    const error = new Conflict();
    assert.equal(error.message, 'Conflict');
  });

  it('NoContent should have a default message', () => {
    const error = new NoContent();
    assert.equal(error.message, 'No Content');
  });

  it('NotFound should have a default message', () => {
    const error = new NotFound();
    assert.equal(error.message, 'Not Found');
  });
});
