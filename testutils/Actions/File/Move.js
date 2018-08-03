const fs = require('fs');
const util = require('util');
const Mebo = require('../../../src');

const Action = Mebo.Action;

// promisifying
const rename = util.promisify(fs.rename);


/**
 * Moves the input file
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type | Default Value
 * --- | :---: | --- | ---
 * sourceFile | ::on:: | {@link FilePath} | ::none::
 * targetFile | ::on:: | {@link FilePath} | ::none::
 */
class Move extends Action{

  /**
   * Creates the action
   */
  constructor(){
    super();

    this.createInput('sourceFile: filePath', {exists: true});
    this.createInput('targetFile: filePath');
  }

  /**
   * Implements the execution of the action
   *
   * @param {Object} data - plain object containing the value of the inputs
   * @return {Promise<boolean>} boolean telling if the
   * file has been moved
   * @protected
   */
  async _perform(data){

    await rename(data.sourceFile, data.targetFile);

    return true;
  }
}

// Registering action
Mebo.Action.register(Move, 'file.move');

module.exports = Move;
