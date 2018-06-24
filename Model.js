'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventBus = require('modapp/eventBus');

var _eventBus2 = _interopRequireDefault(_eventBus);

var _obj = require('modapp-utils/obj');

var obj = _interopRequireWildcard(_obj);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Model is a generic data model.
 * @implements {module:modapp~Model}
 */
var Model = function () {

	/**
  * Creates a Model instance
  * @param {object} [opt] Optional parameters.
  * @param {object} [opt.definition] Object definition. If not provided, any value will be allowed.
  * @param {object} [opt.data] Initial data.
  * @param {string} [opt.namespace] Event bus namespace. Defaults to 'model'.
  * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
  */
	function Model() {
		var opt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

		_classCallCheck(this, Model);

		this._definition = opt.definition || null;
		this._namespace = opt.namespace || 'model';
		this._eventBus = opt.eventBus || _eventBus2.default;

		if (opt.data) {
			this._update(opt.data, false);
		}
	}

	/**
  * Attach an event handler function for one or more session events.
  * @param {?string} events One or more space-separated events. Null means any event.
  * @param {Event~eventCallback} handler A function to execute when the event is emitted.
  */


	_createClass(Model, [{
		key: 'on',
		value: function on(events, handler) {
			this._eventBus.on(this, events, handler, this._namespace);
		}

		/**
   * Remove an event handler.
   * @param {?string} events One or more space-separated events. Null means any event.
   * @param {Event~eventCallback} [handler] An option handler function. The handler will only be remove if it is the same handler.
   */

	}, {
		key: 'off',
		value: function off(events, handler) {
			this._eventBus.off(this, events, handler, this._namespace);
		}

		/**
   * Sets model properties
   * If any property where changed, this will trigger a change event.
   * @param {object} props Properties to set
   * @returns {Promise} Promise to the setting of the properties.
   */

	}, {
		key: 'set',
		value: function set(props) {
			return Promise.resolve(this._update(props, true));
		}

		/**
   * Returns the model definition, or null if none is set.
   * @returns {?object} Object definition
   */

	}, {
		key: 'getDefinition',
		value: function getDefinition() {
			return this._definition;
		}

		/**
   * Updates the properties.
   * @param {object} props Properties to update.
   * @param {boolean} emit Flag if changes though be emitted on the eventBus.
   * @returns {?object} Key/value object with the change properties and old values, or null if there were no changes.
   * @private
   */

	}, {
		key: '_update',
		value: function _update(props, emit) {
			if (!props) {
				return null;
			}

			var changed = null;
			if (this._definition) {
				changed = obj.update(this, props, this._definition);
			} else {
				for (var key in props) {
					if (key && props.hasOwnProperty(key) && key.substr(0, 1) !== '_' && (this.hasOwnProperty(key) || !this[key])) {
						if (props[key] !== this[key]) {
							changed = changed || {};
							changed[key] = this[key];
							if (props[key] === undefined) {
								delete this[key];
							} else {
								this[key] = props[key];
							}
						}
					}
				}
			}

			if (changed && emit) {
				this._eventBus.emit(this, this._namespace + '.change', changed);
			}

			return changed;
		}
	}, {
		key: 'toJSON',
		value: function toJSON() {
			if (this._definition) {
				return obj.copy(this, this._definition);
			}

			var props = {};
			for (var key in this) {
				if (key && this.hasOwnProperty(key) && key.substr(0, 1) !== '_') {
					props[key] = this[key];
				}
			}
			return props;
		}
	}]);

	return Model;
}();

exports.default = Model;