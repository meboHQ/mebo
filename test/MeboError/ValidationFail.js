const assert = require('assert');
const Mebo = require('../../src');

const ValidationFail = Mebo.MeboErrors.ValidationFail;


describe('ValidationFail:', () => {

  it('Should create an instance with only a message', () => {
    const error = new ValidationFail('Some Message');
    assert.equal(error.message, 'Some Message');
  });

  it('Should create an instance with an input name', () => {
    const error = new ValidationFail('Some Message', null, 'inputName');
    assert.equal(error.inputName, 'inputName');
  });

  it('Should create an instance with an error code', () => {
    const error = new ValidationFail('Some Message', '96c45e1f-cd2f-417f-9977-cf96101366ef', 'inputName');
    assert.equal(error.code, '96c45e1f-cd2f-417f-9977-cf96101366ef');
  });

  it('Should test the json support', () => {
    const errorA = new ValidationFail('Some Message', '96c45e1f-cd2f-417f-9977-cf96101366ef', 'inputName');
    const errorB = ValidationFail.fromJSON(errorA.toJSON());

    assert.equal(errorA.message, errorB.message);
    assert.equal(errorA.code, errorB.code);
    assert.equal(errorA.inputName, errorB.inputName);
  });
});
