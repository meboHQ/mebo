const Settings = require('./Settings');

/**
 * Base exception class used by mebo exceptions.
 */
class MeboError extends Error{

  constructor(message){
    super(message);

    /**
     * Status code used by the {@link Handler} when this error is raised from inside of a top
     * level action (an action that has not been created from another action).
     *
     * Value driven by:
     * `Settings.get('error/status')`
     * (default: `409`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/status');

    /**
     * Boolean telling if this error is not allowed as output ({@link Handler.output})
     * when it has been raised from a nested action (an action created from another
     * action ({@link Action.createAction})). When output is disabled the error
     * will not be handled by the {@link Writer}, therefore the error will be
     * emitted by the signal {@link Handler.onErrorDuringOutput}.
     *
     * Value driven by:
     * `Settings.get('error/disableOutputInNested')`
     * (default: `false`)
     *
     * @type {boolean}
     */
    this.disableOutputInNested = Settings.get('error/disableOutputInNested');
  }
}

// default settings
Settings.set('error/status', 500);
Settings.set('error/disableOutputInNested', false);

module.exports = MeboError;
