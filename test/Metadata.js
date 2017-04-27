const assert = require('assert');
const minimatch = require('minimatch');
const Mebo = require('../src');

const Metadata = Mebo.Metadata;


describe('Metadata:', () => {

  it('Metadata should start empty by default', () => {
    const metadata = new Metadata();
    assert.equal(metadata.root().length, 0);
  });

  it('Should insert a new metadata', () => {
    const metadata = new Metadata();

    metadata.setValue('a.b.c', 1);

    assert.equal(metadata.root().length, 1);
    assert.equal(metadata.root()[0], 'a');
    assert.equal(metadata.value('a.b.c'), 1);
  });

  it('Should assign an option variable under metadata', () => {
    const value = 'someValue';

    Metadata.registerOptionVar('$myVarA', value);
    assert.equal(Metadata.optionVar('$myVarA'), value);
  });

  it('Should test for a circular reference error when assigning an option variable', () => {

    Metadata.registerOptionVar('$myVarA', '$myVarB');
    Metadata.registerOptionVar('$myVarB', '$myVarC');
    Metadata.registerOptionVar('$myVarC', '$myVarA');

    try{
      Metadata.optionVar('$myVarA');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Circular reference detected while processing the value for *')){
        throw err;
      }
    }
  });

  it('Should assign a value using an option variable', () => {

    // setting variable
    Metadata.registerOptionVar('$myVarA', 'd');
    Metadata.registerOptionVar('$myVarB', 'a.b.c.$myVarA');

    // creating a metadata Object
    const metadata = new Metadata();
    metadata.setValue('$myVarB.value', 10);

    // checking value
    assert.equal(metadata.root().length, 1);
    assert.equal(metadata.root()[0], 'a');
    assert.equal(metadata.value('a').b.c.d.value, 10);
    assert.equal(metadata.value('$myVarB.value'), 10);
  });

  it('Should return the raw value (processValue=false) of the option variable', () => {

    // setting variable
    Metadata.registerOptionVar('$myVarA', 'd');
    Metadata.registerOptionVar('$myVarB', 'a.b.c.$myVarA');

    assert.equal(Metadata.optionVar('$myVarB', false), 'a.b.c.$myVarA');
  });

  it('Should tell if the option variable exists', () => {

    // setting variable
    Metadata.registerOptionVar('$newVariable10', 'hi');

    assert(Metadata.hasOptionVar('$newVariable10'));
    assert(!Metadata.hasOptionVar('$nonExistingVariable'));
  });

  it('Should return the list of the available option variables', () => {

    const currentVarsLength = Metadata.registeredOptionVars().length;

    // setting variable
    Metadata.registerOptionVar('$newAvailableVariable', 'value');
    assert.equal(currentVarsLength + 1, Metadata.registeredOptionVars().length);

    // assign variable again, it should not create a new entry
    Metadata.registerOptionVar('$newAvailableVariable', 'value');
    assert.equal(currentVarsLength + 1, Metadata.registeredOptionVars().length);

    // checking if variable name is part of the result
    assert(Metadata.registeredOptionVars().includes('$newAvailableVariable'));
  });

  it('Should fail to get the value from a undefined option variable', () => {

    try{
      Metadata.optionVar('$nonExistingVariable');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Option variable * is undefined')){
        throw err;
      }
    }
  });

  it('Should fail to set a value under the metadata when path contains an undefined option variable', () => {

    try{
      const metadata = new Metadata();
      metadata.setValue('a.$nonExistingVariable', 10);
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Option variable * is undefined')){
        throw err;
      }
    }
  });

  it('Should fail when option variable name does not start with $', () => {

    try{
      Metadata.registerOptionVar('customVariable', 'testing');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Option variable * needs to start with: $')){
        throw err;
      }
    }
  });

  it('Should fail when option variable name is empty', () => {

    try{
      Metadata.registerOptionVar('$', 'testing');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (err.message !== 'Option variable cannot be empty'){
        throw err;
      }
    }
  });

  it('Should fail when option variable name contains invalid characters', () => {

    try{
      Metadata.registerOptionVar('$invalidName -$', 'testing');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Option variable * contains invalid characters')){
        throw err;
      }
    }
  });
});
