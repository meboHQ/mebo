const assert = require('assert');
const Mebo = require('../../../src');

const Input = Mebo.Input;


describe('Ip Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: ip');
    assert.equal(input.value(), null);
  });

  it('Ip address value version 4 should be accepted', () => {
    const input = Input.create('input: ip');
    input.setValue('127.0.0.1');

    return input.validate.bind(input)();
  });

  it('Should test isV4 method', () => {
    const input = Input.create('input: ip');

    input.setValue('127.0.0.1');
    assert(input.isV4());

    input.setValue('127');
    assert(!input.isV4());

    input.setValue('::ffff:127.0.0.1');
    assert(!input.isV4());
  });

  it('Should test isV6 method', () => {
    const input = Input.create('input: ip');

    input.setValue('::ffff:127.0.0.1');
    assert(input.isV6());

    input.setValue('@');
    assert(!input.isV6());
  });

  it('Ip address value version 6 should be accepted', () => {
    const input = Input.create('input: ip');
    input.setValue('::ffff:127.0.0.1');

    return input.validate.bind(input)();
  });

  it('Invalid Ip address value should be rejected', (done) => {
    const input = Input.create('input: ip');
    input.setValue('127.0.0.1.366');

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('Should test if the ip is private', () => {
    const input = Input.create('input: ip');

    input.setValue('127.0.0.1');
    assert(input.isPrivate());

    input.setValue('75.157.10.26');
    assert(!input.isPrivate());
  });

  it('Should only allow ipv4', () => {
    const input = Input.create('input: ip', {allowV6: false});
    input.setValue('127.0.0.1');

    return input.validate.bind(input)();
  });

  it('Should fail when only ipv4 is allowed (ip carries a ipv6 value)', (done) => {
    const input = Input.create('input: ip', {allowV6: false});
    input.setValue('::ffff:127.0.0.1');

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '54cb9e90-468e-49ea-8f34-512a7b729d28') ? null : new Error('unexpected value'));
    });
  });

  it('Should allow ipv6', () => {
    const input = Input.create('input: ip', {allowV6: true});
    input.setValue('::ffff:127.0.0.1');

    return input.validate.bind(input)();
  });
});
