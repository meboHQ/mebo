const fs = require('fs');
const path = require('path');
const util = require('util');
const promisify = require('es6-promisify');
const debug = require('debug')('Mebo');
const ValidationFail = require('../Errors/ValidationFail');
const Input = require('../Input');
const BaseText = require('./BaseText');

// promisifying
const stat = promisify(fs.stat);


/**
* File Path input.
*
* ```javascript
* const input = Input.create('myInput: filePath');
* input.setValue('/tmp/foo.txt');
* ```
*
* <h2>Property Summary</h2>
*
* Property Name | Description | Defined&nbsp;by Default | Default Value
* --- | --- | :---: | :---:
* restrictWebAccess | boolean telling if the input should have restrict access \
* when handling requests. When enabled it only lets the input to be set by a file upload, \
* making sure that the input cannot be set otherwise (like through a string) | ::on:: | ::true::
* maxFileSize | maximum file size in bytes | ::off:: | ::none::
* exists | checks if the file path exists | ::off:: | ::none::
* allowedExtensions | specific list of extensions allowed by the input \
* (this check is case insensitive), example: ['jpg', 'png'] | ::off:: | ::none::
*
* All properties including the inherited ones can be listed via
* {@link registeredPropertyNames}
*/
class FilePath extends BaseText{

  /**
  * Returns either the extension of the file path or an empty string in case the
  * file path does not have an extension
  *
  * ```javascript
  * let myInput = Input.createInput('myInput: filePath');
  * myInput.setValue('/tmp/file.jpg');
  * console.log(myInput.extension()); // jpg
  * ```
  *
  * @param {null|number} [at] - index used when input has been created as a vector that
  * tells which value should be used
  * @return {string}
  */
  extension(at=null){

    let result = '';

    if (!this.isEmpty()){
      const value = this.valueAt(at);
      const ext = path.extname(value);

      if (ext.length > 1){
        result = ext.slice(1);
      }
    }

    return result;
  }

  /**
  * Returns the basename of the file path
  *
  * ```javascript
  * const myInput = Input.createInput('myInput: filePath');
  * myInput.setValue('/tmp/file.jpg');
  * console.log(myInput.basename()); // 'file.jpg'
  * ```
  *
  * @param {null|number} [at] - index used when input has been created as a vector that
  * tells which value should be used
  * @return {string}
  */
  basename(at=null){
    return path.basename(this.valueAt(at));
  }

  /**
  * Returns the dirname of the file path
  *
  * ```javascript
  * let myInput = Input.createInput('myInput: filePath');
  * myInput.setValue('/tmp/file.jpg');
  * console.log(myInput.dirname()); // tmp
  * ```
  *
  * @param {null|number} [at] - index used when input has been created as a vector that
  * tells which value should be used
  * @return {string}
  */
  dirname(at=null){
    return path.dirname(this.valueAt(at));
  }

  /**
  * Returns the file stats
  *
  * @param {null|number} [at] - index used when input has been created as a vector that
  * tells which value should be used
  * @return {Promise<Object>}
  */
  async stat(at=null){

    // returning from cache
    if (this._isCached('stats', at)){
      return this._getFromCache('stats', at);
    }

    // otherwise processing stats
    const stats = await stat(this.valueAt(at));
    this._setToCache('stats', stats, at);
    return stats;
  }

  /**
   * Implements input's validations
   *
   * @param {null|number} at - index used when input has been created as a vector that
   * tells which value should be used
   * @return {Promise<*>} value held by the input based on the current context (at)
   * @protected
   */
  async _validation(at){

    // calling super class validations
    // todo: babel does not support 'await' calling a method under 'super'
    // https://github.com/babel/babel/issues/3930
    // const value = await super._validation(at);
    const value = await BaseText.prototype._validation.call(this, at);

    // only specific extensions
    if (this.property('allowedExtensions') && !this.property('allowedExtensions').map(x => x.toLowerCase()).includes(this.extension(at).toLowerCase())){
      throw new ValidationFail(
        util.format("Extension '%s' is not supported! (supported extensions: %s)", this.extension(at), this.property('allowedExtensions')),
        '05139388-f4ec-4496-be20-f794eb14d1ff',
      );
    }

    // file exists & max size
    if (this.property('exists') || this.property('maxFileSize')){

      let stats = null;
      let err = null;
      try{
        stats = await this.stat(at);
      }
      catch(errr){
        err = errr;
        debug(err);
      }

      if (this.property('exists') && err && err.code === 'ENOENT'){
        err = new ValidationFail(
          'File does not exist',
          'dedf89bc-c57a-4ce7-ab84-f84f49144230',
        );
      }
      else if (stats !== null && this.property('maxFileSize') && stats.size > this.property('maxFileSize')){
        err = new ValidationFail(
          util.format('File size (%.1f mb) exceeds the limit allowed (%.1f mb)', stats.size/1024/1024, this.property('maxFileSize')/1024/1024),
          '99c3aeff-241b-4120-a708-d2e1ca1a1dce',
        );
      }

      if (err){
        throw (err);
      }
    }

    return value;
  }
}

// registering the input
Input.register(FilePath);

// registering properties
Input.registerProperty(FilePath, 'maxFileSize');
Input.registerProperty(FilePath, 'exists');
Input.registerProperty(FilePath, 'allowedExtensions');

module.exports = FilePath;
