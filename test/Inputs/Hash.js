const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Mebo = require('../../src');

const Input = Mebo.Input;


describe('Hash Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: hash', {size: 96});
    assert.equal(input.value(), null);
  });

  it('Size property should be locked during the construction', () => {
    const input = Input.create('input: hash', {size: 96});
    assert(input.isPropertyLocked('size'));
  });

  it('Should fail to create an input without the size property', (done) => {

    let error = new Error('should have failed');
    try{
      Input.create('input: hash');
    }
    catch(err){
      error = err;
      if (error.message === "Can't create a hash input (input) without the 'size' property!"){
        error = null;
      }
    }

    done(error);
  });

  it('Should not allow a hash value that does not meet the required size', (done) => {
    const input = Input.create('input: hash', {size: 96});
    input.setValue('FFFFFF');

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === 'c83d98b0-8409-47c3-89c9-f81452c910c0') ? null : err);
    });
  });

  it('Hash value should be accepted', () => {
    const input = Input.create('input: hash', {size: 96});
    input.setValue('58DC14D58C154011C2ABD97F');

    return input.validate.bind(input)();
  });

  it('Should accept hash that matches the size property (xxHash)', () => {
    const input = Input.create('input: hash', {size: 64});
    input.setValue('b542f74248124c32');

    return input.validate.bind(input)();
  });

  it('Should accept hash that matches the size property (SHA1)', () => {
    const input = Input.create('input: hash', {size: 160});
    input.setValue('da39a3ee5e6b4b0d3255bfef95601890afd80709');

    return input.validate.bind(input)();
  });

  it('Should accept hash that matches the size property (SHA256)', () => {
    const input = Input.create('input: hash', {size: 256});
    input.setValue('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    return input.validate.bind(input)();
  });

  it('Should be able to generate random hashes', () => {
    const input = Input.create('input: hash', {size: 128});

    return (async () => {
      const alreadyCreated = [];
      for (let i=0; i < 1000; i++){
        input.setRandom();

        const value = input.value();
        assert(TypeCheck.isString(value));
        assert(!alreadyCreated.includes(value));
        await input.validate(); // eslint-disable-line no-await-in-loop

        alreadyCreated.push(value);
      }
    })();
  });

  it('Should not be able to generate random hashes in a vector input', () => {
    const input = Input.create('input: hash[]', {size: 128});
    let failed = false;

    try{
      input.setRandom();
    }
    catch(err){
      if (err.message === 'Not supported, input is a vector!'){
        failed = true;
      }
    }

    assert(failed);
  });

  it('Vector value should be able to be parsed directly from a json version', () => {
    const testValue = JSON.stringify(['FF', 'FA', '00']);
    const input = Input.create('input: hash[]', {size: 8});
    input.parseValue(testValue);

    assert.equal(input.value().length, 3);
    assert.equal(input.value()[0], 'FF');
    assert.equal(input.value()[1], 'FA');
    assert.equal(input.value()[2], '00');
  });

  it('Should test the vector serialization and parsing', () => {
    return (async () => {

      const testValue = ['FF', 'FA', '00'];
      const input = Input.create('input: hash[]', {size: 8});
      input.setValue(testValue);

      const serializedValue = await input.serializeValue();
      input.setValue(null);
      input.parseValue(serializedValue);

      assert.equal(input.value().length, 3);
      assert.equal(input.value()[0], 'FF');
      assert.equal(input.value()[1], 'FA');
      assert.equal(input.value()[2], '00');
    })();
  });

  it('Vector value should be able to be serialized as string', (done) => {
    const input = Input.create('input: hash[]', {size: 8});
    input.setValue(['FF', 'FA', '00']);

    input.serializeValue().then((value) => {
      done((value === '["FF","FA","00"]') ? null : new Error('unexpected value'));
    }).catch((err) => {
      done(err);
    });
  });
});
