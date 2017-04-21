const fs = require('fs');
const promisify = require('es6-promisify');
const Mebo = require('../../../src');

const Action = Mebo.Action;

// promisifying
const stat = promisify(fs.stat);


/**
 * Copy the input file to the target file path
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type | Default Value
 * --- | :---: | --- | ---
 * sourceFile | ::on:: | {@link FilePath} | ::none::
 * targetFile | ::on:: | {@link FilePath} | ::none::
 * createTargetDirectories | ::off:: | {@link Bool} | `true`
 */
class Copy extends Action{

  /**
   * Creates the action
   */
  constructor(){
    super();

    this.createInput('sourceFile: filePath', {exists: true});
    this.createInput('targetFile: filePath');
    this.createInput('createTargetDirectories: bool', {defaultValue: true});
  }

  /**
   * Implements the execution of the action
   *
   * @param {Object} data - plain object containing the value of the inputs
   * @return {Promise<boolean>} boolean telling if the
   * file has been copied
   * @protected
   */
  async _perform(data){

    const targetFolder = this.input('targetFile').dirname();

    // creating sub-folders
    if (data.createTargetDirectories){
      try{
        await stat(targetFolder);
      }
      catch(err){
        await Mebo.Util.mkdirs(targetFolder);
      }
    }

    // doing the file copy
    await this._fsCopy();

    return true;
  }

  /**
   * Auxiliary method that performs the file copy
   *
   * @return {Promise<boolean>} boolean telling if the value has been copied
   * @private
   */
  _fsCopy(){

    return new Promise((resolve, reject) => {

      const rd = fs.createReadStream(this.input('sourceFile').value());

      /* istanbul ignore next */
      rd.on('error', (err) => {
        reject(err);
      });

      const wr = fs.createWriteStream(this.input('targetFile').value());

      wr.on('error', (err) => {
        rd.close();
        reject(err);
      });

      wr.on('close', (ex) => {
        resolve(true);
      });

      rd.pipe(wr);
    });
  }
}

// Registering action
Mebo.registerAction(Copy, 'file.copy');

module.exports = Copy;
