const MeboError = require('../MeboError');
const Settings = require('../Settings');


/**
 * Exception raised when a resource already exists.
 *
 * This error is provided by Mebo to complement the rest support ({@link Web.restful}),
 * although the main purpose is to provide a status code which is used when reporting
 * it through requests, it can still be used when an action is executed
 * through a different handler since it defines a custom exception type that can be
 * used to identify the error.
 *
 * @see {@link Writer._errorOutput}
 */
class Conflict extends MeboError{

  constructor(message='Conflict'){
    super(message);

    /**
     * Status code used by the {@link Handler} when this error is raised from inside of a top
     * level action (an action that has not been created from another action).
     *
     * Value driven by:
     * `Settings.get('error/conflict/status')`
     * (default: `409`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/conflict/status');

    /**
     * Boolean telling if this error is not allowed as output ({@link Handler.output})
     * when it has been raised from a nested action (an action created from another
     * action ({@link Action.createAction})). When output is disabled the error
     * will not be handled by the {@link Writer}, therefore the error will be
     * emitted by the signal {@link Handler.onErrorDuringOutput}.
     *
     * Value driven by:
     * `Settings.get('error/conflict/disableOutputInNested')`
     * (default: `false`)
     *
     * @type {boolean}
     */
    this.disableOutputInNested = Settings.get('error/conflict/disableOutputInNested');
  }
}

// default settings
Settings.set('error/conflict/status', 409);
Settings.set('error/conflict/disableOutputInNested', false);

module.exports = Conflict;
