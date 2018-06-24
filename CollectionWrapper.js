'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventBus = require('modapp/eventBus');

var _eventBus2 = _interopRequireDefault(_eventBus);

var _array = require('modapp-utils/array');

var array = _interopRequireWildcard(_array);

var _obj = require('modapp-utils/obj');

var obj = _interopRequireWildcard(_obj);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A wrapper for a {@link module:modapp~Collection},
 * exposing the underlaying data but can provide a different sort order,
 * mapping of models, or filtering of models.
 * It will transparently propagate emitted add and remove events.
 * @implements {module:modapp~Collection}
 */
var CollectionWrapper = function () {

	/**
  * Creates an CollectionWrapper instance.
  * @param {object} collection Collection object to wrap.
  * @param {object} [opt] Optional parameters.
  * @param {function} [opt.map] Model map callback. If not provided, model objects will be stored as is.
  * @param {function} [opt.filter] Model filter callback. Parameter is a model of the underlying collection.
  * @param {function} [opt.compare] Sort compare function.
  * @param {string} [opt.namespace] Event bus namespace. Defaults to 'collectionWrapper'.
  * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
  */
	function CollectionWrapper(collection) {
		var opt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		_classCallCheck(this, CollectionWrapper);

		this._collection = collection;

		obj.update(this, opt, {
			filter: { type: '?function', property: '_filter' },
			map: { type: '?function', property: '_map' },
			compare: { type: '?function', property: '_compare' },
			namespace: { type: 'string', default: 'collectionWrapper', property: '_namespace' },
			eventBus: { type: 'object', default: _eventBus2.default, property: '_eventBus' }
		});

		if (this._map && (this._filter || this._compare)) {
			this._weakMap = new WeakMap();
		}

		// Bind callbacks
		this._onAdd = this._onAdd.bind(this);
		this._onRemove = this._onRemove.bind(this);
		if (this._filter) {
			this._onChange = this._onChange.bind(this);
		}

		this._initList();
		this._setEventListeners(true);
	}

	_createClass(CollectionWrapper, [{
		key: '_initList',
		value: function _initList() {
			var _this = this;

			this._list = [];

			var getModel = this._map ? function (item) {
				return _this._map(item, _this._collection);
			} : function (item) {
				return item;
			};
			var setWeakMap = this._weakMap ? function (item, m) {
				return _this._weakMap.set(item, m);
			} : function () {};
			var add = this._filter ? function (item, m) {
				if (item.on) {
					item.on('change', _this._onChange);
				}
				_this._list.push(_this._wrapModel(m, item));
			} : function (item, m) {
				return _this._list.push(_this._wrapModel(m, item));
			};

			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = this._collection[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var item = _step.value;

					var m = getModel(item);
					setWeakMap(item, m);
					add(item, m);
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

			if (this._compare) {
				this._list.sort(function (a, b) {
					return _this._compare(a.m, b.m);
				});
			}
		}

		/**
   * Attach an event handler function for one or more session events.
   * @param {?string} events One or more space-separated events. Null means any event.
   * @param {Event~eventCallback} handler A function to execute when the event is emitted.
   */

	}, {
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
	}, {
		key: 'atIndex',
		value: function atIndex(idx) {
			var cont = this._list[idx];
			return cont ? cont.m : undefined;
		}
	}, {
		key: 'indexOf',
		value: function indexOf(model) {
			var idx = -1;
			if (this._filter) {
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = this._list[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var cont = _step2.value;

						if (cont.f) {
							idx++;
							if (cont.m === model) {
								return idx;
							}
						} else {
							if (cont.m === model) {
								return -1;
							}
						}
					}
				} catch (err) {
					_didIteratorError2 = true;
					_iteratorError2 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}
					} finally {
						if (_didIteratorError2) {
							throw _iteratorError2;
						}
					}
				}

				return -1;
			} else {
				var _iteratorNormalCompletion3 = true;
				var _didIteratorError3 = false;
				var _iteratorError3 = undefined;

				try {
					for (var _iterator3 = this._list[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
						var _cont = _step3.value;

						idx++;
						if (_cont.m === model) {
							return idx;
						}
					}
				} catch (err) {
					_didIteratorError3 = true;
					_iteratorError3 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion3 && _iterator3.return) {
							_iterator3.return();
						}
					} finally {
						if (_didIteratorError3) {
							throw _iteratorError3;
						}
					}
				}
			}
		}
	}, {
		key: 'filter',
		value: function filter(_filter) {
			return this._filter ? this._list.filter(function (cont) {
				return cont.f && _filter(cont.m);
			}) : this._list.filter(function (cont) {
				return _filter(cont.m);
			});
		}
	}, {
		key: 'map',
		value: function map(filter) {
			return this._filter ? this._list.filter(function (cont) {
				return cont.f;
			}).map(function (cont) {
				return filter(cont.m);
			}) : this._list.map(function (cont) {
				return filter(cont.m);
			});
		}
	}, {
		key: 'toJSON',
		value: function toJSON() {
			return this._filter ? this._list.filter(function (cont) {
				return cont.f;
			}).map(function (cont) {
				return cont.m.toJSON ? cont.m.toJSON() : cont.m;
			}) : this._list.map(function (cont) {
				return cont.m.toJSON ? cont.m.toJSON() : cont.m;
			});
		}
	}, {
		key: '_wrapModel',
		value: function _wrapModel(m, item) {
			return this._filter ? { m: m, f: this._filter(item) } : { m: m };
		}
	}, {
		key: '_setEventListeners',
		value: function _setEventListeners(on) {
			if (!this._collection.on) {
				return;
			}

			if (on) {
				this._collection.on('add', this._onAdd);
				this._collection.on('remove', this._onRemove);
			} else {
				this._collection.off('add', this._onAdd);
				this._collection.off('remove', this._onRemove);
			}
		}
	}, {
		key: '_binarySearch',
		value: function _binarySearch(m) {
			var _this2 = this;

			return array.binarySearch(this._list, { m: m }, function (a, b) {
				return _this2._compare(a.m, b.m);
			});
		}
	}, {
		key: '_onChange',
		value: function _onChange(changed, item) {
			var m = this._weakMap ? this._weakMap.get(item) : item;

			var idx = void 0,
			    cont = void 0,
			    emitIdx = 0;
			if (this._compare) {
				idx = this._binarySearch(m);
				cont = this._list[idx];
			} else {
				var len = this._list.length;
				for (idx = 0; idx < len; idx++) {
					var c = this._list[idx];
					if (c.m === m) {
						cont = this._list[idx];
						break;
					}
					if (c.f) {
						emitIdx++;
					}
				}
				if (!cont) {
					return;
				}
			}

			var f = this._filter(item);
			if (f === cont.f) {
				return;
			}

			if (f) {
				cont.f = true;
				if (this._compare) {
					emitIdx = this.indexOf(m);
				}
				this._eventBus.emit(this, this._namespace + '.add', {
					item: cont.m,
					idx: emitIdx
				});
			} else {
				if (this._compare) {
					emitIdx = this.indexOf(m);
				}
				cont.f = false;
				this._eventBus.emit(this, this._namespace + '.remove', {
					item: cont.m,
					idx: emitIdx
				});
			}
		}
	}, {
		key: '_onAdd',
		value: function _onAdd(e) {
			if (!this._collection) {
				return;
			}

			var m = void 0,
			    idx = void 0;

			if (this._map && this._compare) {
				m = this._map(e.item, this._collection);
				idx = this._binarySearch(m);
			} else {
				m = this._map ? this._map(e.item, this._collection) : e.item;
				idx = this._compare ? this._binarySearch(m) : e.idx;
			}

			if (this._weakMap) {
				this._weakMap.set(e.item, m);
			}

			if (idx < 0) {
				// If idx < 0, the value contains the bitwise compliment of where the
				// model would fit.
				idx = ~idx;
			}

			var cont = this._wrapModel(m, e.item);
			this._list.splice(idx, 0, cont);

			if (this._filter) {
				if (e.item.on) {
					e.item.on('change', this._onChange);
				}

				if (!cont.f) {
					return;
				}
				idx = this.indexOf(m);
			}

			this._eventBus.emit(this, this._namespace + '.add', {
				item: m,
				idx: idx
			});
		}
	}, {
		key: '_onRemove',
		value: function _onRemove(e) {
			if (!this._collection) {
				return;
			}

			var cont = void 0,
			    m = void 0,
			    idx = void 0;

			if (this._map && this._compare) {
				m = this._weakMap.get(e.item);
				if (!m) {
					throw "Removed item not in WeakMap";
				}
				idx = this._binarySearch(m);
				cont = this._list[idx];
			} else if (this._map) {
				idx = e.idx;
				cont = this._list[idx];
			} else {
				idx = this._compare ? this._binarySearch(e.item) : e.idx;
				cont = this._list[idx];
			}

			if (this._weakMap) {
				this._weakMap.delete(e.item);
			}

			var emitIdx = idx;

			if (this._filter) {
				if (e.item.on) {
					e.item.off('change', this._onChange);
				}

				if (!cont.f) {
					this._list.splice(idx, 1);
					return;
				}

				emitIdx = this.indexOf(cont.m);
			}

			this._list.splice(idx, 1);

			this._eventBus.emit(this, this._namespace + '.remove', {
				item: cont.m,
				idx: emitIdx
			});
		}
	}, {
		key: 'dispose',
		value: function dispose() {
			if (!this._collection) {
				return;
			}

			this._setEventListeners(false);
			delete this._collection;
			delete this._weakMap;
		}
	}, {
		key: Symbol.iterator,
		value: function value() {
			var i = 0;
			var arr = this._list;
			var len = this._list.length;
			var done = { done: true };

			if (this._filter) {
				return {
					next: function next() {
						while (i < len) {
							a = arr[i];
							i++;
							if (a.f) {
								return {
									value: a.m,
									done: false
								};
							}
						}

						return done;
					}
				};
			}

			return {
				next: function next() {
					return i < len ? { value: arr[i++].m, done: false } : done;
				}
			};
		}
	}, {
		key: 'length',
		get: function get() {
			return this._filter ? this._list.filter(function (cont) {
				return cont.f;
			}).length : this._list.length;
		}
	}]);

	return CollectionWrapper;
}();

exports.default = CollectionWrapper;