const fs = require('fs');
const os = require('os');
const path = require('path');
const debug = require('debug')('Mebo');
const http = require('http');
const https = require('https');
const uuid = require('uuid');
const util = require('util');
const Mebo = require('../../../src');

const Action = Mebo.Action;

// promisifying
const unlink = util.promisify(fs.unlink);


/**
 * Downloads the input url to the target file path
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type | Default Value
 * --- | :---: | --- | ---
 * inputUrl | ::on:: | {@link Url} | ::none::
 * targetFolder | ::on:: | {@link FilePath} | `TMPDIR`
 * createTargetDirectories | ::off:: | {@link Bool} | ::none::
 */
class Download extends Action{

  /**
   * Creates the action
   */
  constructor(){
    super();

    this.createInput('inputUrl: url');
    this.createInput('targetFolder: filePath', {defaultValue: os.tmpdir()});
    this.createInput('createTargetDirectories: bool', {defaultValue: true});
  }

  /**
   * Implements the execution of the action
   *
   * @param {Object} data - plain object containing the value of the inputs
   * @return {Promise<string>} string containing the path of the download file
   * @protected
   */
  async _perform(data){

    const targetFolder = data.targetFolder;
    let targetFullFileName = path.join(targetFolder, uuid.v4());

    // creating sub-folders
    if (data.createTargetDirectories){
      await Mebo.Utils.mkdirs(targetFolder);
    }

    // extension
    if (this.input('inputUrl').extension()){
      targetFullFileName += `.${this.input('inputUrl').extension()}`;
    }

    try{
      await this._run(targetFullFileName);
    }
    catch(err){
      // deletes any residual file async
      try{
        await unlink(targetFullFileName);
      }
      catch(error){
        debug(`Could not delete the file: ${targetFullFileName}`);
      }

      throw err;
    }

    return targetFullFileName;
  }

  /**
   * Auxiliary method that performs the download
   *
   * @param {string} targetFullFileName - file path used to store the downloaded file
   * @return {Promise}
   */
  _run(targetFullFileName){

    return new Promise((resolve, reject) => {
      const s = fs.createWriteStream(targetFullFileName);

      s.on('error', (err) => {
        reject(err);
      });

      /* istanbul ignore next */
      const httpModule = (this.input('inputUrl').protocol() === 'http:') ? http : https;

      httpModule.get(this.input('inputUrl').value(), (response) => {
        response.pipe(s);

        s.on('finish', () => {

          // close() is async, the callback is called after close completes.
          s.close(() => {
            resolve(targetFullFileName);
          });
        });

      }).on('error', /* istanbul ignore next */ (err) => {
        reject(err);
      });
    });
  }
}

// Registering action
Mebo.Action.register(Download, 'file.download');

module.exports = Download;
