const assert = require('assert');
const stream = require('stream');
const Mebo = require('../src');

const Writer = Mebo.Writer;


describe('Writer:', () => {

  class CustomWriter extends Writer{
    constructor(value){
      super(value);
      this.result = {};
      this.setOption('defaultOption', 'test');
    }

    _errorOutput(){
      this.result = super._errorOutput();
      return this.result;
    }

    _successOutput(){
      this.result = super._successOutput();
      return this.result;
    }
  }

  it('Should test custom options defined to the writer', () => {

    const writer = new CustomWriter(20);
    // default option
    assert.equal(writer.option('defaultOption'), 'test');
  });

  it('Should test serialize a value as output', () => {

    const value = 20;

    const writer = new CustomWriter(value);
    writer.serialize();

    assert.equal(writer.result, value);
  });

  it("A buffer value should be converted to a stream automatically when the option 'convertBufferToReadableStream' is enabled (default)", () => {

    const writer = new CustomWriter(Buffer.from('test'));
    writer.serialize();

    assert(writer.result instanceof stream.Readable);
  });

  it("A buffer value should not be converted to a stream automatically when the option 'convertBufferToReadableStream' is disabled", () => {

    const writer = new CustomWriter(Buffer.from('test'));
    writer.setOption('convertBufferToReadableStream', false);
    writer.serialize();

    assert(writer.result instanceof Buffer);
  });

  it('Should test serialize a vector value as output', () => {

    const value = [
      {a: 1},
      {a: 2},
    ];

    const writer = new CustomWriter(value);
    writer.serialize();

    assert(writer.result);
    assert.equal(writer.result.length, value.length);
    assert.equal(writer.result[0].a, value[0].a);
    assert.equal(writer.result[1].a, value[1].a);
  });

  it('Should use the value defined by the output option', () => {

    const writer = new CustomWriter('ignore this value');
    writer.setOption('result', 'use it instead');
    writer.serialize();

    assert.equal(writer.result, 'use it instead');
  });

  it('Should test serialize an error as output', () => {

    const err = new Mebo.Errors.ValidationFail('Some Error');

    const writer = new CustomWriter(err);
    writer.serialize();
    assert.equal(writer.result, err.toJSON());
  });
});
