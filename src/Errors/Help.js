const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Settings = require('../Settings');


/**
 * Exception raised when when help is requested for a handler.
 *
 * Handlers can provide a help output to describe the specification
 * and requirements for {@link Action}. The way the help is queried
 * is defined per handler bases.
 *
 * @see {@link Writer._errorOutput}
 */
class Help extends Error{

  constructor(message){
    assert(TypeCheck.isString(message) && message.length, 'message needs to defined as valid string (cannot be empty)');

    super(message);

    /**
     * Status code used by the {@link Handler} when this error is raised from inside of a top
     * level action (an action that has not been created from another action).
     *
     * Value driven by:
     * `Settings.get('error/help/status')`
     * (default: `700`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/help/status');

    /**
     * Boolean telling if this error is not allowed as output ({@link Handler.output})
     * when it has been raised from a nested action (an action created from another
     * action ({@link Action.createAction})). When output is disabled the error
     * will not be handled by the {@link Writer}, therefore the error will be
     * emitted by the signal {@link Handler.onErrorDuringOutput}.
     *
     * Value driven by:
     * `Settings.get('error/help/disableOutputInNested')`
     * (default: `false`)
     *
     * @type {boolean}
     */
    this.disableOutputInNested = Settings.get('error/help/disableOutputInNested');
  }
}

// default settings
Settings.set('error/help/status', 700);
Settings.set('error/help/disableOutputInNested', true);

module.exports = Help;
