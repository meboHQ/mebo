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

  it('Should assign a path variable under metadata', () => {
    const value = 'someValue';

    Metadata.registerPathVar('$myVarA', value);
    assert.equal(Metadata.pathVar('$myVarA'), value);
  });

  it('Should test for a circular reference error when assigning a path variable', () => {

    Metadata.registerPathVar('$myVarA', '$myVarB');
    Metadata.registerPathVar('$myVarB', '$myVarC');
    Metadata.registerPathVar('$myVarC', '$myVarA');

    try{
      Metadata.pathVar('$myVarA');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Circular reference detected while processing the value for *')){
        throw err;
      }
    }
  });

  it('Should assign a value using a path variable', () => {

    // setting variable
    Metadata.registerPathVar('$myVarA', 'd');
    Metadata.registerPathVar('$myVarB', 'a.b.c.$myVarA');

    // creating a metadata Object
    const metadata = new Metadata();
    metadata.setValue('$myVarB.value', 10);

    // checking value
    assert.equal(metadata.root().length, 1);
    assert.equal(metadata.root()[0], 'a');
    assert.equal(metadata.value('a').b.c.d.value, 10);
    assert.equal(metadata.value('$myVarB.value'), 10);
  });

  it('Should return the raw value (processValue=false) of the path variable', () => {

    // setting variable
    Metadata.registerPathVar('$myVarA', 'd');
    Metadata.registerPathVar('$myVarB', 'a.b.c.$myVarA');

    assert.equal(Metadata.pathVar('$myVarB', false), 'a.b.c.$myVarA');
  });

  it('Should tell if the path variable exists', () => {

    // setting variable
    Metadata.registerPathVar('$newVariable10', 'hi');

    assert(Metadata.hasPathVar('$newVariable10'));
    assert(!Metadata.hasPathVar('$nonExistingVariable'));
  });

  it('Should return the list of the available path variables', () => {

    const currentVarsLength = Metadata.registeredPathVars().length;

    // setting variable
    Metadata.registerPathVar('$newAvailableVariable', 'value');
    assert.equal(currentVarsLength + 1, Metadata.registeredPathVars().length);

    // assign variable again, it should not create a new entry
    Metadata.registerPathVar('$newAvailableVariable', 'value');
    assert.equal(currentVarsLength + 1, Metadata.registeredPathVars().length);

    // checking if variable name is part of the result
    assert(Metadata.registeredPathVars().includes('$newAvailableVariable'));
  });

  it('Should fail to get the value from a undefined path variable', () => {

    try{
      Metadata.pathVar('$nonExistingVariable');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Path variable * is undefined')){
        throw err;
      }
    }
  });

  it('Should fail to set a value under the metadata when path contains an undefined path variable', () => {

    try{
      const metadata = new Metadata();
      metadata.setValue('a.$nonExistingVariable', 10);
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Path variable * is undefined')){
        throw err;
      }
    }
  });

  it('Should fail when path variable name does not start with $', () => {

    try{
      Metadata.registerPathVar('customVariable', 'testing');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Path variable * needs to start with: $')){
        throw err;
      }
    }
  });

  it('Should fail when path variable name is empty', () => {

    try{
      Metadata.registerPathVar('$', 'testing');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (err.message !== 'Path variable cannot be empty'){
        throw err;
      }
    }
  });

  it('Should fail when path variable name contains invalid characters', () => {

    try{
      Metadata.registerPathVar('$invalidName -$', 'testing');
      throw new Error('Should have failed!');
    }
    catch(err){
      if (!minimatch(err.message, 'Path variable * contains invalid characters')){
        throw err;
      }
    }
  });
});
