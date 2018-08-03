const util = require('util');
const path = require('path');
const url = require('url');
const http = require('http');
const https = require('https');
const TypeCheck = require('js-typecheck');
const Input = require('../Input');
const ValidationFail = require('../Errors/ValidationFail');
const BaseText = require('./BaseText');


/**
* Url Input.
*
* It supports the protocols: `http`, `https`
*
* ```javascript
* const input = Input.create('myInput: url');
* input.setValue('http://www.google.com');
* ```
*
* <h2>Property Summary</h2>
*
* Property Name | Description | Defined&nbsp;by Default | Default Value
* --- | --- | :---: | :---:
* maxContentSize | maximum file size of url's content in bytes | ::on:: | `5242880` (5mb)
* exists | checks if the url is valid | ::off:: | ::none::
* allowedExtensions | specific list of extensions for the input \
* (this check is case insensitive) example: ['jpg', 'png'] | ::off:: | ::none::
*
* All properties including the inherited ones can be listed via
* {@link registeredPropertyNames}
*/
class Url extends BaseText{

  /**
   * Returns the url extension (for instance: jpg) or empty string
   *
   * @param {null|number} [at] - index used when input has been created as a vector that
   * tells which value should be used
   * @return {string}
   */
  extension(at=null){

    if (!this._isCached('extension', at)){
      let extension = '';
      const value = this.valueAt(at);

      // computing the value and caching it
      if (TypeCheck.isString(value)){
        this._parseUrl(at);

        const ext = path.extname(this._getFromCache('urlParsed', at).pathname);
        if (ext.length > 1){
          extension = ext.slice(1);
        }
      }

      this._setToCache('extension', extension, at);
    }

    return this._getFromCache('extension', at);
  }

  /**
   * Returns the url protocol `http:` or `https:`
   *
   * @param {null|number} [at] - index used when input has been created as a vector that
   * tells which value should be used
   * @return {string}
   */
  protocol(at=null){

    if (!this._isCached('protocol', at)){
      let protocol = '';
      const value = this.valueAt(at);

      if (TypeCheck.isString(value)){
        if (value.startsWith('http:')){
          protocol = 'http:';
        }

        /* istanbul ignore next */
        else if (value.startsWith('https:')){
          protocol = 'https:';
        }
      }

      this._setToCache('protocol', protocol, at);
    }

    return this._getFromCache('protocol', at);
  }

  /**
   * Returns the headers
   *
   * @param {null|number} [at] - index used when input has been created as a vector that
   * tells which value should be used
   * @return {Promise<Object>}
   */
  headers(at=null){

    // returning from cache
    if (this._isCached('headers', at)){
      return Promise.resolve(this._getFromCache('headers', at));
    }

    // otherwise processing headers
    return new Promise((resolve, reject) => {

      this._parseUrl(at);

      const options = Object.create(null);
      options.method = 'HEAD';
      options.protocol = this._getFromCache('urlParsed', at).protocol;
      options.host = this._getFromCache('urlParsed', at).hostname;
      options.port = this._getFromCache('urlParsed', at).port;
      options.path = this._getFromCache('urlParsed', at).path;

      // checking the protocol
      const protocol = this.protocol(at);
      if (['http:', 'https:'].includes(protocol)){

        /* istanbul ignore next */
        const httpModule = (protocol === 'http:') ? http : https;

        // doing the request
        const request = httpModule.request(options, (response) => {

          let errorStatus = null;
          let headers = Object.create(null);
          if (response.statusCode === 200){
            headers = response.headers;
          }
          else{
            errorStatus = new Error('Could not connect to the url');
          }

          if (errorStatus){
            reject(errorStatus);
          }
          else{
            this._setToCache('headers', headers, at);
            resolve(headers);
          }
        });

        /* istanbul ignore next */
        request.on('error', (err) => {
          reject(err);
        });
        request.end();
      }
      else{
        reject(new Error('Invalid protocol'));
      }
    });
  }

  /**
   * Parses the current url data
   * @param {null|number} at - index used when input has been created as a vector that
   * tells which value should be used
   *
   * @private
   */
  _parseUrl(at){
    if (!this._isCached('urlParsed', at)){
      const value = this.valueAt(at);
      this._setToCache('urlParsed', url.parse(value), at);
    }
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

    // supported extensions check
    if (this.property('allowedExtensions') && !this.property('allowedExtensions').map(x => x.toLowerCase()).includes(this.extension(at).toLowerCase())){
      throw new ValidationFail(
        util.format("Extension '%s' is not supported! (supported extensions: %s)", this.extension(at), this.property('allowedExtensions')),
        'fb833b76-2ebb-4f27-be45-dac510bda816',
      );
    }

    // url exists & maximum content size
    if (this.property('exists')){

      let urlHeaders = null;
      let err = null;

      try{
        urlHeaders = await this.headers(at);
      }
      catch(errr){
        err = errr;
      }

      if (this.property('exists') && err){
        err = new ValidationFail(
          'Could not connect to the URL',
          '8471d8f6-3902-45dc-81f7-802e1de73f69',
        );
      }
      else if (!err && this.property('maxContentSize') && urlHeaders['content-length'] > this.property('maxContentSize')){
        err = new ValidationFail(
          util.format('URL content size (%.1f mb) exceeds the limit allowed (%.1f mb)', urlHeaders['content-length']/1024/1024, this.property('maxContentSize')/1024/1024),
          '7d860f72-a562-4bb3-940d-15dd3bd8bed1',
        );
      }

      if (err){
        throw err;
      }
    }

    return value;
  }
}

// registering the input
Input.register(Url);

// registering properties
Input.registerProperty(Url, 'exists', true);
Input.registerProperty(Url, 'maxContentSize', 5 * 1024 * 1024);
Input.registerProperty(Url, 'allowedExtensions');

module.exports = Url;
