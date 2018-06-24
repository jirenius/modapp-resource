'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.sortOrderCompare = sortOrderCompare;

var _SortedMap = require('./SortedMap');

var _SortedMap2 = _interopRequireDefault(_SortedMap);

var _eventBus = require('modapp/eventBus');

var _eventBus2 = _interopRequireDefault(_eventBus);

var _obj = require('modapp-utils/obj');

var obj = _interopRequireWildcard(_obj);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Collection is a generic data collection.
 * @implements {module:modapp~Collection}
 */
var Collection = function () {

	/**
  * Creates a Collection instance
  * @param {object} [opt] Optional settings.
  * @param {Array.<object>} [opt.data] Collection data array.
  * @param {function} [opt.compare] Compare function for sort order. Defaults to insert order.
  * @param {function} [opt.modelFactory] Model factory function. Defaults to using added objects as is.
  * @param {function} [opt.idAttribute] Id attribute callback function. Defaults to returning the object.id property.
  * @param {string} [opt.namespace] Event bus namespace. Defaults to 'collection'.
  * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
  */
	function Collection(opt) {
		_classCallCheck(this, Collection);

		opt = obj.copy(opt, {
			compare: { type: '?function' },
			modelFactory: { type: '?function' },
			idAttribute: { type: 'function', default: function _default(m) {
					return m.id;
				} },
			data: { type: '?object' },
			namespace: { type: 'string', default: 'collection' },
			eventBus: { type: 'object', default: _eventBus2.default }
		});

		this._modelFactory = opt.modelFactory;
		this._idAttribute = opt.idAttribute;
		this._namespace = opt.namespace;
		this._eventBus = opt.eventBus;

		this._map = new _SortedMap2.default(opt.compare);

		// Populate map with initial data
		if (opt.data) {
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = opt.data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var item = _step.value;

					this._addItem(item, false);
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}
		}
	}

	/**
  * Attach an event handler function for one or more instance events.
  * Available events are 'add', 'remove', and 'move'.
  * @param {?string} events One or more space-separated events. Null means any event.
  * @param {EventBus~eventCallback} [handler] A function to execute when the event is emitted.
  * @returns {this}
  */


	_createClass(Collection, [{
		key: 'on',
		value: function on(events, handler) {
			this._eventBus.on(this, events, handler, this._namespace);
			return this;
		}

		/**
  * Remove an instance event handler.
  * Available events are 'add', 'remove', and 'move'.
  * @param {?string} events One or more space-separated events. Null means any event.
  * @param {EventBus~eventCallback} [handler] An option handler function. The handler will only be remove if it is the same handler.
  * @returns {this}
  */

	}, {
		key: 'off',
		value: function off(events, handler) {
			this._eventBus.off(this, events, handler, this._namespace);
			return this;
		}

		/**
   * Add an item to the collection.
   * @param {*} item Item to add
   * @param {idx} [idx] Index value of where to insert the item. Ignored if the collection has a compare function.
   * @returns {number} Index value of where the item was inserted in the list
   */

	}, {
		key: 'add',
		value: function add(item, idx) {
			return this._addItem(item, true, idx);
		}

		/**
   * Remove an item from the collection.
   * @param {string} id Id of the item.
   * @returns {number} Order index of the item before removal. -1 if the item id doesn't exist
   */

	}, {
		key: 'remove',
		value: function remove(id) {
			var item = this.get(id);
			if (!item) return -1;

			var idx = this._map.remove(id);

			// Emit event if an item was removed
			if (idx >= 0) {
				this._eventBus.emit(this, this._namespace + '.remove', { item: item, idx: idx });
			}

			return idx;
		}

		/**
   * Get an item from the collection by id
   * @param {string} id Id of the item
   * @returns {*} Stored item. Undefined if key doesn't exist
   */

	}, {
		key: 'get',
		value: function get(id) {
			return this._map.get(id);
		}

		/**
   * Move an item within the collection.
   * Invalid if the collection has a compare function.
   * @param {string} id Id of the item
   * @param {*} idx Index to move the item to
   * returns {number} Order index of the item before moving. -1 if the item id doesn't exist.
   */

	}, {
		key: 'move',
		value: function move(id, idx) {
			if (this.compare) throw "Cannot use move in list with compare";

			throw "Not implemented";
		}

		/**
   * Retrieves the order index of an item.
   * @param {string|object} item Item or id of the item
   * @returns {number} Order index of the item. -1 if the item id doesn't exist.
   */

	}, {
		key: 'indexOf',
		value: function indexOf(item) {
			if (typeof item === 'string') {
				item = this._map.get(item);
				if (!item) {
					return -1;
				}
			}
			return this._map.indexOf(item);
		}
	}, {
		key: 'atIndex',
		value: function atIndex(idx) {
			return this._map[idx];
		}
	}, {
		key: '_addItem',
		value: function _addItem(item, emit, idx) {
			if (this._modelFactory) {
				item = this._modelFactory(item);
			}

			idx = this._map.add(this._idAttribute(item), item, idx);
			if (emit) {
				this._eventBus.emit(this, this._namespace + '.add', { item: item, idx: idx });
			}
			return idx;
		}
	}, {
		key: Symbol.iterator,
		value: function value() {
			var i = 0,
			    a = this._map,
			    l = a.length;

			return {
				next: function next() {
					return { value: a[i++], done: i > l };
				}
			};
		}
	}, {
		key: 'length',
		get: function get() {
			return this._map.length;
		}
	}]);

	return Collection;
}();

exports.default = Collection;
function sortOrderCompare(a, b) {
	return a.sortOrder - b.sortOrder;
};