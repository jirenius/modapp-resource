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
 * ModifyModel wraps another object or a {@link module:modapp~Model},
 * and sets its own properties to the match.
 * Any property modification that will cause a difference between the models will set the additional
 * property "isModified" to be true.
 * It also listens to changed in the underlying model. If a non-modified property is changed,
 * the ModifyModel will update its own property.
 * Because ModifyModel listens to the underlying model, it needs to be disposed when not used anymore.
 * @implements {module:modapp~Model}
 */
var ModifyModel = function () {

	/**
  * Creates a ModifyModel instance
  * @param {object|Model} model Model object to wrap.
  * @param {object} [opt] Optional parameters.
  * @param {object} [opt.definition] Object definition. If not provided, any value will be allowed.
  * @param {string} [opt.namespace] Event bus namespace. Defaults to 'modifyModel'.
  * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
  */
	function ModifyModel(model) {
		var opt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		_classCallCheck(this, ModifyModel);

		this._model = model;
		this._modification = {};

		this._eventBus = opt.eventBus || _eventBus2.default;
		this._namespace = opt.namespace || 'modifyModel';
		this._definition = opt.definition || null;
		this._modProp = opt.isModifiedProperty || 'isModified';

		var changed = this._update(model);
		this._setIsModified(changed);

		// Bind callbacks
		this._onModelChange = this._onModelChange.bind(this);

		this._setEventListener(true);
	}

	/**
  * Attach an event handler function for one or more session events.
  * @param {?string} events One or more space-separated events. Null means any event.
  * @param {Event~eventCallback} handler A function to execute when the event is emitted.
  */


	_createClass(ModifyModel, [{
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
			var changed = props ? this._update(props) : null;
			changed = this._setIsModified(changed);

			if (changed) {
				this._eventBus.emit(this, this._namespace + '.change', changed);
			}

			return Promise.resolve(changed);
		}

		/**
   * Get the modifications in ModifyModel in comparison to the underlying model object.
   * @returns {?object} Key/value object with modified properties and their new value. Null if there are no modifications.
   */

	}, {
		key: 'getModifications',
		value: function getModifications() {
			return Object.keys(this._modification).length ? Object.assign({}, this._modification) : null;
		}
	}, {
		key: 'getModel',
		value: function getModel() {
			return this._model;
		}
	}, {
		key: '_setIsModified',
		value: function _setIsModified(changed) {
			if (changed) {
				var v = void 0;
				for (var k in changed) {
					v = this._model[k];
					if (this[k] === v || typeof v === 'undefined') {
						delete this._modification[k];
					} else {
						this._modification[k] = this[k];
					}
				}
			}

			// Do we have any modifications
			var newIsModified = Object.keys(this._modification).length > 0;
			if (newIsModified !== this[this._modProp]) {
				changed = changed || {};
				changed[this._modProp] = !newIsModified;
				this[this._modProp] = newIsModified;
			}

			return changed;
		}
	}, {
		key: '_setEventListener',
		value: function _setEventListener(on) {
			if (!this._model || !this._model.on) {
				return;
			}

			if (on) {
				this._model.on('change', this._onModelChange);
			} else {
				this._model.off('change', this._onModelChange);
			}
		}
	}, {
		key: '_onModelChange',
		value: function _onModelChange(changed) {
			var props = void 0,
			    old = void 0;
			for (var k in changed) {
				old = changed[k];
				if (this[k] === old) {
					props = props || {};
					props[k] = this._model[k];
				} else {
					if (this[k] === this._model[k]) {
						delete this._modification[k];
					}
				}
			}

			this.set(props);
		}

		/**
   * Updates the properties.
   * @param {object} props Properties to update.
   * @returns {?object} Key/value object with the change properties and old values, or null if there were no changes.
   * @private
   */

	}, {
		key: '_update',
		value: function _update(props) {
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
	}, {
		key: 'dispose',
		value: function dispose() {
			this._setEventListener(false);
			this._model = null;
		}
	}]);

	return ModifyModel;
}();

exports.default = ModifyModel;