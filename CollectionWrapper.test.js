'use strict';

var _Model = require('./Model');

var _Model2 = _interopRequireDefault(_Model);

var _Collection = require('./Collection');

var _Collection2 = _interopRequireDefault(_Collection);

var _CollectionWrapper = require('./CollectionWrapper');

var _CollectionWrapper2 = _interopRequireDefault(_CollectionWrapper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("CollectionWrapper", function () {
	var collection = void 0;
	var wrapper = void 0;
	var idx = void 0;
	var getIdx = void 0;

	jest.useFakeTimers();

	beforeEach(function () {
		collection = new _Collection2.default({
			modelFactory: function modelFactory(item) {
				return new _Model2.default({ data: item });
			},
			data: [{ id: 10, fruit: 'banana' }, { id: 20, fruit: 'pineapple' }, { id: 30, fruit: 'orange' }, { id: 40, fruit: 'apple' }]
		});

		idx = null;
		getIdx = jest.fn(function (e) {
			return idx = e.idx;
		});
	});

	afterEach(function () {
		if (wrapper) {
			wrapper.dispose();
			wrapper = null;
		}
	});

	describe("map", function () {
		it("returns mapped underlying collection without filter", function () {
			wrapper = new _CollectionWrapper2.default(collection);
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['banana', 'pineapple', 'orange', 'apple']);
		});

		it("adds new model to collection", function () {
			wrapper = new _CollectionWrapper2.default(collection);

			var idx = void 0;
			wrapper.on('add', function (e) {
				return idx = e.idx;
			});
			collection.add({ id: 50, fruit: 'passionfruit' });
			jest.runAllTimers();
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['banana', 'pineapple', 'orange', 'apple', 'passionfruit']);
			expect(idx).toBe(4);
		});

		it("removes model from collection", function () {
			wrapper = new _CollectionWrapper2.default(collection);
			wrapper.on('remove', getIdx);
			collection.remove(20);
			jest.runAllTimers();
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['banana', 'orange', 'apple']);
			expect(idx).toBe(1);
		});
	});

	describe("opt.compare", function () {
		it("propagates a sorted collection", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				compare: function compare(a, b) {
					return a.fruit.localeCompare(b.fruit);
				}
			});
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['apple', 'banana', 'orange', 'pineapple']);
		});

		it("adds new model in sorted collection", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				compare: function compare(a, b) {
					return a.fruit.localeCompare(b.fruit);
				}
			});
			wrapper.on('add', getIdx);
			collection.add({ id: 50, fruit: 'passionfruit' });
			jest.runAllTimers();
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['apple', 'banana', 'orange', 'passionfruit', 'pineapple']);
			expect(idx).toBe(3);
		});

		it("removes model from sorted collection", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				compare: function compare(a, b) {
					return a.fruit.localeCompare(b.fruit);
				}
			});
			wrapper.on('remove', getIdx);
			collection.remove(10);
			jest.runAllTimers();
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['apple', 'orange', 'pineapple']);
			expect(idx).toBe(1);
		});
	});

	describe("opt.filter", function () {
		it("propagates a filtered collection", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				filter: function filter(m) {
					return m.fruit.length <= 6;
				}
			});
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['banana', 'orange', 'apple']);
		});

		it("adds new model in filtered collection", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				filter: function filter(m) {
					return m.fruit.length <= 6;
				}
			});
			wrapper.on('add', getIdx);
			collection.add({ id: 50, fruit: 'kiwi' });
			jest.runAllTimers();
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['banana', 'orange', 'apple', 'kiwi']);
			expect(idx).toBe(3);
		});

		it("removes model from filtered collection", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				filter: function filter(m) {
					return m.fruit.length <= 6;
				}
			});
			wrapper.on('remove', getIdx);
			collection.remove(30);
			jest.runAllTimers();
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['banana', 'apple']);
			expect(idx).toBe(1);
		});

		it("does not trigger event on adding filtered model to collection", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				filter: function filter(m) {
					return m.fruit.length <= 6;
				}
			});
			wrapper.on('add', getIdx);
			collection.add({ id: 50, fruit: 'passionfruit' });
			jest.runAllTimers();
			expect(getIdx).not.toBeCalled();
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['banana', 'orange', 'apple']);
		});

		it("does not trigger event on removing filtered model from collection", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				filter: function filter(m) {
					return m.fruit.length <= 6;
				}
			});
			wrapper.on('remove', getIdx);
			collection.remove(20);
			jest.runAllTimers();
			expect(getIdx).not.toBeCalled();
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['banana', 'orange', 'apple']);
		});

		it("adds filtered model in on model change", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				filter: function filter(m) {
					return m.fruit.length <= 6;
				}
			});
			wrapper.on('add', getIdx);
			var model = collection.get(20);
			model.set({ fruit: 'kiwi' });
			jest.runAllTimers();
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['banana', 'kiwi', 'orange', 'apple']);
			expect(idx).toBe(1);
		});
	});

	describe("opt.map", function () {
		it("propagates a mapped collection", function () {
			wrapper = new _CollectionWrapper2.default(collection, {
				map: function map(m) {
					return { id: m.id, fruit: m.fruit.toUpperCase() };
				}
			});
			expect(wrapper.map(function (m) {
				return m.fruit;
			})).toEqual(['BANANA', 'PINEAPPLE', 'ORANGE', 'APPLE']);
		});
	});
});