const assert = require('assert');
const path = require('path');
const TypeCheck = require('js-typecheck');
const Settings = require('../../Settings');
const Metadata = require('../../Metadata');
const Action = require('../../Action');
const Input = require('../../Input');
const Handler = require('../../Handler');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _request = Symbol('request');
const _response = Symbol('response');


/**
 * Handles the web integration through expressjs and passportjs.
 *
 * It enables the execution of actions triggered by web requests.
 * The request information is read by {@link WebRequest}, this information
 * is passed to the action during the execution of the web handler
 * ({@link Web.execute}). The output of this handler ({@link Web.output}) is done
 * through the {@link WebResponse} writer.
 *
 * In order to tell which actions are visible by this handler, they are required to
 * be registered beforehand via a webfication process that describes their
 * request method, rest route and if it requires authentication.
 *
 * ```
 * Mebo.webfyAction('myRegisteredAction', 'get', {restRoute: '/myApi/action', auth: true});
 * ```
 *
 * In case of actions that require authentication (`auth: true`) Mebo checks if
 * the authentication has been executed before executing the action. Therefore,
 * a passport authentication is required to be defined beforehand which can
 * be done through {@link addBeforeAuthAction}:
 *
 * ```
 * Mebo.addBeforeAuthAction(passport);
 * ```
 *
 * Also, custom middlewares can be added before the execution of any action through
 * {@link addBeforeAction}:
 *
 * ```
 * Mebo.addBeforeAction((req, res, next) => {...});
 * ```
 *
 * After the webfication process, actions can be triggered in two ways:
 *
 * - *Rest support* ({@link Web.restful}):
 * Executes an action through a rest route, it happens when an action is webfied
 * with `restRoute` where it becomes automatically visible as part of the
 * restful support. In order to activated the restful support you need to tel
 * Mebo what is the expressjs app you want to register the rest routes:
 * ```javascript
 * const app = express();
 * // this process registers the rest route for the webfied actions
 * Mebo.restful(app);
 * ```
 * The result of webfied actions is done through the restful support is automatically
 * by using google's json style guide. The only exceptions are readable stream
 * and buffer that are piped to the response
 * ({@link Web._successOutput}, {@link Web._errorOutput}).
 *
 * - *Middleware support* ({@link Web.middleware}):
 * Executes an action through an arbitrary route. Actions can be executed as
 * expressjs middlewares.
 * It's done by using `Mebo.middleware` where you tell what is the action's
 * registration name that should be executed for the express route
 * (make sure the action has been webfied before hand). By using this feature
 * you control the response of the request, since the result of the action
 * is passed to the middleware:
 * ```javascript
 * const app = express();
 * app.get(
 *    '/foo',
 *    Mebo.middleware('myRegisteredAction', (err, result, req, res) => {
 *      // some sauce...
 *    })
 * );
 * ```
 *
 * **Express req and res**
 *
 * The request and the response used by this handler are available
 * under the {@link Session} as: `session.get('req')` and `session.get('res')`.
 *
 * @see http://expressjs.com
 * @see http://passportjs.org
 */
class Web extends Handler{

  /**
   * Creates a web handler
   * @param {Session} session - Session object instance
   */
  constructor(session){
    super(session);

    this[_request] = null;
    this[_response] = null;
  }

  /**
   * Sets the request object created by the express server.
   *
   * It also includes the request as part of the session: `session.get('request')`
   *
   * @see http://expressjs.com/en/api.html#req
   * @param {Object} req - request object
   */
  setRequest(req){
    assert(TypeCheck.isObject(req) && req.method, 'Invalid request object');

    this[_request] = req;
    this.session().set('req', req);

    // adding the remote ip address to the autofill as remoteAddress
    try{
      this.session().setAutofill(
        'remoteAddress',
        req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      );
    }
    catch(err){
      /* istanbul ignore next */
      console.error('Failed to set the autofill remoteAddress based on the request'); // eslint-disable-line no-console
    }
  }

  /**
   * Returns the request object created by the express server
   *
   * @see http://expressjs.com/en/api.html#req
   * @return {Object|null}
   */
  request(){
    return this[_request];
  }

  /**
   * Sets the response object created by the express server
   *
   * It also includes the response as part of the session: `session.get('response')`
   *
   * @see http://expressjs.com/en/api.html#res
   * @param {Object} res - response object
   */
  setResponse(res){
    assert(TypeCheck.isObject(res) && TypeCheck.isObject(res.locals), 'Invalid response object');

    this[_response] = res;
    this.session().set('res', res);
  }

  /**
   * Returns the response object created by the express server
   *
   * @see http://expressjs.com/en/api.html#res
   * @return {Object|null}
   */
  response(){
    return this[_response];
  }

  /**
   * Makes an action available for requests.
   *
   * By doing that the action gets visible for the {@link restful} and {@link middleware} support.
   *
   * Alternatively this method can be called directly from Mebo as `Mebo.webfyAction(...)`
   *
   * @param {Action|string} actionClassOrName - action class or registered action name
   * @param {string|Array<string>} requestMethod - tells the request method about how the action should
   * be available, for instance: `get`, `post`, `put`, `delete` (...). Multiples methods
   * can be defined through an array of method names.
   * @param {Object} options - custom options
   * @param {boolean} [options.auth=null] - boolean telling if the action requires authentication
   * when set to `null` (default) this information is driven by the setting
   * ⚠ `handler/web/requireAuthByDefault` (default: `false`).
   * @param {string} [options.restRoute] - the rest route from which the action should be executed from
   * the {@link restful} support. You can use route parameters as well that later are translated to
   * input values to further information take a look at ({@link WebRequest}).
   */
  static webfyAction(actionClassOrName, requestMethod, {auth=null, restRoute=null}={}){
    assert((actionClassOrName !== Action && TypeCheck.isSubClassOf(actionClassOrName, Action)) || TypeCheck.isString(actionClassOrName),
    'action needs to be defined as valid string or Action class!');
    assert(TypeCheck.isString(requestMethod) || TypeCheck.isList(requestMethod),
      'requestMethod needs to be defined as string or list of method names!');
    assert(restRoute === null || TypeCheck.isString(restRoute), 'restRoute needs to be defined as string');

    const actionName = (TypeCheck.isSubClassOf(actionClassOrName, Action) ? actionClassOrName.name : actionClassOrName).toLowerCase();
    assert(Action.registeredAction(actionName), `Action: ${actionName} not found, is it registered ?`);

    // registering action
    let requestMethods = (TypeCheck.isString(requestMethod)) ? [requestMethod] : requestMethod;
    requestMethods = requestMethods.map(x => x.toLowerCase());

    // finding duplicated items
    const removeIndexes = [];
    for (let i=0, len=this._webfyActions.length; i < len; ++i){
      const webfiedAction = this._webfyActions[i];
      const action = webfiedAction.actionName;
      const method = webfiedAction.method;

      if (requestMethods.includes(method) && restRoute === webfiedAction.restRoute){

        // when the method and route is already being used by another action then removing
        // that from the registration, since the method and route will be registered
        // for a different action
        if (action in this._actionMethodToWebfiedIndex && method in this._actionMethodToWebfiedIndex[action]){
          delete this._actionMethodToWebfiedIndex[action][method];
        }

        removeIndexes.push(i);
      }
    }

    // removing duplicated items
    if (removeIndexes.length){
      for (let i=0, len=removeIndexes.length; i < len; ++i){
        this._webfyActions.splice(removeIndexes[i]-i, 1);
      }
    }

    // storing the action under the auxiliary data struct 'action method to webfied index'
    if (!(actionName in this._actionMethodToWebfiedIndex)){
      this._actionMethodToWebfiedIndex[actionName] = Object.create(null);
    }

    // adding the routes
    for (const method of requestMethods){
      const webfiedAction = Object.create(null);
      webfiedAction.actionName = actionName;
      webfiedAction.method = method;
      webfiedAction.auth = auth;
      webfiedAction.restRoute = restRoute;

      // adding the index about where the webfied action is localized
      // under the 'action method to webfied index'
      this._actionMethodToWebfiedIndex[actionName][method] = this._webfyActions.length;

      // adding the webfied action information
      this._webfyActions.push(webfiedAction);
    }
  }

  /**
   * Returns a middleware designed to execute a webfied {@link Web.webfyAction}
   * based on an arbitrary express route. Differently from {@link Web.restful} this method
   * does not response the request, instead it's done through the responseCallback
   * which passes the action `error`, `result` and the default middleware express
   * arguments, for instance:
   *
   * ```javascript
   * const app = express();
   * app.get(
   *    '/foo',
   *    Mebo.middleware('myRegisteredAction', (err, result, req, res) => {
   *      // ...
   *    })
   * );
   * ```
   *
   * @param {string} actionName - registered action name
   * @param {function} [responseCallback] - optional response callback that overrides
   * the default json response. The callback carries the express:
   * function(err, result, req, res, next){...}
   * @return {function}
   */
  static middleware(actionName, responseCallback){
    return this._createMiddleware(actionName, responseCallback);
  }

  /**
   * Adds a middleware that is executed before an action.
   *
   * Use this feature when you want to execute a custom middleware before the
   * execution of an action. If you want to add a middleware for a specific
   * web handler implementation then take a look at {@link Web.beforeAction}. All middlewares
   * registered by this method are executed after {@link addBeforeAuthAction}.
   *
   * Alternatively this method can be called directly from Mebo as `Mebo.addBeforeAction(...)`
   *
   * In order to pass a values computed by a "before middleware" to the action you need to
   * add the values to the handler session, so the action can read them later. The
   * web handler is available under `res.locals.web`, for instance:
   * ```
   * const web = res.locals.web;
   * web.session().setAutofill('customValue', 'myValue');
   * ```
   *
   * Where any input assigned with the autofill property 'someCustom' is going to be
   * assigned with the 'something' value:
   *
   * ```
   * class MyAction extends Mebo.action{
   *   constructor(){
   *      super();
   *      // gets assigned with `something` value
   *      this.createInput('a: text', {autofill: 'customValue'});
   *   }
   * }
   * ```
   *
   * @param {function} middleware - expressjs middleware that should be executed
   * before the action
   *
   * @see http://expressjs.com/en/guide/using-middleware.html
   */
  static addBeforeAction(middleware){
    assert(TypeCheck.isCallable(middleware), 'middleware needs to defined as a callable');

    this._beforeActionMiddlewares.push(middleware);
  }

  /**
   * Adds a middleware that is executed before an action that requires authentication.
   *
   * Use this feature when you want to execute a custom middleware before the
   * execution of an action that requires authentication. If you want to add a
   * middleware for a specific web handler implementation then take a look at
   * {@link Web.beforeAuthAction}. All middlewares registered by this method are
   * executed before {@link addBeforeAction}.
   *
   * Use this feature to define the passportjs authentication middleware.
   *
   * Alternatively this method can be called directly from Mebo as `Mebo.addBeforeAuthAction(...)`
   *
   * In order to pass a values computed by a "before middleware" to the action you need to
   * add the values to the handler session, so the action can read them later. The
   * web handler is available under `res.locals.web`, for instance:
   * ```
   * const web = res.locals.web;
   * web.session().setAutofill('customValue', 'value');
   * ```
   *
   * Where any input assigned with the autofill property 'customValue' is going to be
   * assigned with 'value':
   *
   * ```
   * class MyAction extends Mebo.action{
   *   constructor(){
   *      super();
   *      // gets assigned with `something`
   *      this.createInput('a: text', {autofill: 'customValue'});
   *   }
   * }
   * ```
   *
   * @param {function} middleware - expressjs middleware that should be executed
   * before an action that requires authentication
   *
   * @see http://expressjs.com/en/guide/using-middleware.html
   */
  static addBeforeAuthAction(middleware){
    assert(TypeCheck.isCallable(middleware), 'middleware needs to defined as a callable');

    this._beforeAuthActionMiddlewares.push(middleware);
  }

  /**
   * Returns a list middlewares that are executed before an action.
   *
   * This method can be re-implemented by subclasses to include custom middlewares
   * that are tied with a specific web handler implementation. By default it returns
   * the middlewares added through {@link Web.addBeforeAction}
   *
   * @return {Array<function>}
   */
  static beforeAction(){
    return this._beforeActionMiddlewares.slice(0);
  }

  /**
   * Returns a list middlewares that are executed before an action that requires auth
   *
   * This method can be re-implemented by subclasses to include custom middlewares
   * that are tied with a specific web handler implementation. By default it returns
   * the middlewares added through {@link Web.addBeforeAuthAction}
   *
   * @return {Array<function>}
   */
  static beforeAuthAction(){
    return this._beforeAuthActionMiddlewares.slice(0);
  }

  /**
   * Adds the restful support to the express app.
   *
   * It works by registering the rest routes for the webfied visible actions
   * ({@link Web.webfyAction}) to the express app. The response of actions
   * executed through the rest support is done via the output method.
   *
   * ```javascript
   * const app = express();
   * Mebo.restful(app);
   * ```
   * or
   * ```javascript
   * const app = express();
   * Mebo.restful(app, '/api'); // adding a prefix for the rest routes
   * ```
   *
   * @param {Object} expressApp - expressjs application instance
   * @param {string} [prefix] - optional prefix that gets included in the
   * registration of the rest routes
   */
  static restful(expressApp, prefix=''){

    assert(TypeCheck.isCallable(expressApp.use), 'Invalid express instance!');
    assert(TypeCheck.isString(prefix), 'prefix must be defined as string');

    // registering the routes
    for (const webfiedAction of this._webfyActions){
      if (webfiedAction.restRoute !== null){
        expressApp[webfiedAction.method](
          path.join(prefix, webfiedAction.restRoute),
          this._createMiddleware(webfiedAction.actionName),
        );
      }
    }
  }

  /**
   * Creates an instance of a reader for the current handler
   *
   * This passes the {@link Web.request} to the reader.
   *
   * @param {Action} action - action instance used by the reader to parse the values
   * @param {Object} options - plain object containing the options passed to the reader
   * @return {Reader}
   * @protected
   */
  _createReader(action, options){
    const reader = super._createReader(action, options);

    // setting request to the reader
    reader.setRequest(this.request());

    return reader;
  }

  /**
   * Creates an instance of a writer for the current handler.
   *
   * This passes the {@link Web.response} to the reader and
   * the request.query.context as an option to the writer.
   *
   * @param {*} value - arbitrary value passed to the writer
   * @param {Object} options - plain object containing the options passed to the writer
   * @return {Writer}
   * @protected
   */
  _createWriter(value, options){
    const writer = super._createWriter(value, options);

    // setting response to the writer
    writer.setResponse(this.response());

    // adding context as part of the result
    const query = this.request().query;
    if ('context' in query && writer.option('root')){
      writer.setOption('root.context', query.context);
    }

    return writer;
  }

  /**
   * Returns a wrapped middleware which makes sure that actions requiring auth
   * use the middleware otherwise the middleware is skipped
   *
   * @param {function} middleware - auth middleware
   * @return {function}
   * @private
   */
  static _wrapAuthMiddleware(middleware){
    return (req, res, next) => {
      if (res.locals.web.requireAuth){
        middleware(req, res, next);
      }
      else{
        next();
      }
    };
  }

  /**
   * Auxiliary method that creates a middleware containing an action
   *
   * @param {string} actionName - registered action name which should be executed by the middleware
   * @param {function} [responseCallback] - optional response callback that overrides
   * the default json response. The callback carries the express:
   * function(err, result, req, res, next){...}
   * @return {function}
   * @private
   */
  static _createMiddleware(actionName, responseCallback=null){

    const checkActionMiddleware = (req, res, next) => {
      const method = req.method.toLowerCase();

      // checking if the action is webfied for the current request method
      const normalizedName = actionName.toLowerCase();
      if (!(method in this._actionMethodToWebfiedIndex[normalizedName])){
        return res.sendStatus(404);
      }

      // storing the request handler inside of the res.locals, so this object
      // can be accessed later by the action
      res.locals.web = Handler.create('web', normalizedName);
      res.locals.web.setRequest(req);
      res.locals.web.setResponse(res);

      const actionDataIndex = this._actionMethodToWebfiedIndex[normalizedName][method];
      res.locals.web.requireAuth = this._webfyActions[actionDataIndex].auth;

      next();
    };

    // creating the middleware that executes the action
    const actionMiddleware = (req, res, next) => {

      // assuring the authentication has been done
      assert(res.locals.web.requireAuth !== undefined);
      assert(!res.locals.web.requireAuth || req.user !== undefined, "Can't execute an auth action without authentication!");

      // creates the action
      const web = res.locals.web;
      const render = (!TypeCheck.isCallable(responseCallback));

      // executing the action middleware
      web.execute(actionName).then((result) => {
        if (render){
          web.output(result);
        }
        // callback that handles the response (Mebo.middleware)
        else{
          responseCallback(null, result, req, res, next);
        }
        // runaway promise
        return null;
      }).catch((err) => {
        if (render){
          web.output(err);
        }
        // callback that handles the response (Mebo.middleware)
        else{
          responseCallback(err, null, req, res, next);
        }
      });
    };

    const WebHandlerClass = this.registeredHandler('web', actionName);

    // final middleware list
    const result = [checkActionMiddleware,
      ...WebHandlerClass.beforeAuthAction().map(this._wrapAuthMiddleware),
      ...WebHandlerClass.beforeAction(),
      actionMiddleware,
    ];

    return result;
  }

  static _beforeAuthActionMiddlewares = [];
  static _beforeActionMiddlewares = [];
  static _webfyActions = [];
  static _actionMethodToWebfiedIndex = Object.create(null);
}

// default settings
Settings.set('handler/web/requireAuthByDefault', false); // ⚠ BE CAREFUL

// registering input properties
Input.registerProperty('filePath', 'restrictWebAccess', true);

// registering path vars
Metadata.registerOptionVar('$web', 'handler.web');
Metadata.registerOptionVar('$webUploadDirectory', '$web.readOptions.uploadDirectory');
Metadata.registerOptionVar('$webUploadPreserveName', '$web.readOptions.uploadPreserveName');
Metadata.registerOptionVar('$webUploadMaxFileSize', '$web.readOptions.uploadMaxFileSize');
Metadata.registerOptionVar('$webMaxFields', '$web.readOptions.maxFields');
Metadata.registerOptionVar('$webMaxFieldsSize', '$web.readOptions.maxFieldsSize');
Metadata.registerOptionVar('$webHeaders', '$web.writeOptions.headers');
Metadata.registerOptionVar('$webHeadersOnly', '$web.writeOptions.headersOnly');
Metadata.registerOptionVar('$webResult', '$web.writeOptions.result');
Metadata.registerOptionVar('$webRoot', '$web.writeOptions.root');
Metadata.registerOptionVar('$webSuccessStatus', '$web.writeOptions.successStatus');
Metadata.registerOptionVar('$webResultLabel', '$web.writeOptions.resultLabel');

// registering handler
Handler.registerHandler(Web);

// exporting module
module.exports = Web;
