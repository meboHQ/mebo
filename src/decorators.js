const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Action = require('./Action');
const Input = require('./Input');
const Handler = require('./Handler');


/**
 * Generic registration, can be used for {@link Input}, {@link Action} and {@link Handler}
 *
 * @param {...args} args - arguments passed to the registration
 * @return {function}
 */
function register(...args){
  return (target) => {
    target.register(target, ...args);
  };
}

/**
 * Allows the action to be executed through the handler
 *
 * @param {string} handlerName - name of the handler
 * @param {...args} args - arguments passed to the registration
 * @return {function}
 */
function grant(handlerName, ...args){
  return (target) => {
    assert(TypeCheck.isSubClassOf(target, Action), 'grant decorator requires an action');
    const registeredActionName = Action.registeredActionName(target);
    Handler.grantAction(handlerName, registeredActionName, ...args);
  };
}

/**
 * Registers a property to an input
 *
 * @param {string} propertyName - property name to be registered
 * @returns {function}
 */
function property(propertyName, ...args){
  return (target) => {
    assert(TypeCheck.isSubClassOf(target, Input), 'property decorator requires an input');

    Input.registerProperty(target, propertyName, ...args);
  };
}

module.exports.register = register;
module.exports.grant = grant;
module.exports.property = property;
