const fs = require('fs');
const crypto = require('crypto');
const Mebo = require('../../../src');

const Action = Mebo.Action;


/**
 * Returns a checksum for the input file
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type | Default Value
 * --- | :---: | --- | ---
 * file | ::on:: | {@link FilePath} | ::none::
 * algo | ::off:: | {@link Text} | `sha256`
 */
class Checksum extends Action{

  /**
   * Creates the action
   */
  constructor(){
    super();

    this.createInput('file: filePath', {exists: true});

    // hash algorithms supported by node.js
    this.createInput('algo: text', {defaultValue: 'sha256'});
  }

  /**
   * Implements the execution of the action
   *
   * @param {Object} data - plain object containing the value of the inputs
   * @return {Promise<string>} string containing the checksum
   * @protected
   */
  _perform(data){

    return new Promise((resolve, reject) => {

      const hash = crypto.createHash(data.algo);
      const stream = fs.ReadStream(data.file);

      stream.on('data', (d) => {
        hash.update(d);
      });

      stream.on('error', (err) => {
        reject(err);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
    });
  }
}

// Registering action
Mebo.registerAction(Checksum, 'file.checksum');

module.exports = Checksum;
