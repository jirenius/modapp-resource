import Model from './Model';
import Collection from './Collection';
import CollectionWrapper from './CollectionWrapper';
import eventBus from 'modapp-eventbus';

describe("CollectionWrapper", () => {
	let items;
	let collection;
	let wrapper;
	let idx;
	let getIdx;
	let recordedEvents;
	let recorderAttached;
	var eventRecorder = (event) => jest.fn(e => recordedEvents.push(Object.assign(e, { event })));

	jest.useFakeTimers();

	function attachRecorder() {
		if (!recorderAttached && wrapper) {
			recorderAttached = { add: eventRecorder("add"), remove: eventRecorder("remove") };
			wrapper.on('add', recorderAttached.add);
			wrapper.on('remove', recorderAttached.remove);
		}
	}

	function detachRecorder() {
		if (recorderAttached) {
			wrapper.off('add', recorderAttached.add);
			wrapper.off('remove', recorderAttached.remove);
			recorderAttached = null;
		}
	}

	beforeEach(() => {
		// Clear eventbus listeners
		eventBus._evs = {};

		items = {
			10: { id: 10, fruit: 'banana' },
			20: { id: 20, fruit: 'pineapple' },
			30:	{ id: 30, fruit: 'orange' },
			40:	{ id: 40, fruit: 'apple' },
			50:	{ id: 50, fruit: 'kiwi' }
		};
		collection = new Collection({
			modelFactory: item => new Model({ data: item }),
			data: [
				items[10],
				items[20],
				items[30],
				items[40]
			]
		});

		idx = null;
		recordedEvents = [];
		getIdx = jest.fn(e => idx = e.idx);
	});

	afterEach(() => {
		detachRecorder();
		if (wrapper) {
			wrapper.dispose();
			wrapper = null;
		}
		// Validate we dont have any undisposed listeners
		expect(Object.keys(eventBus._evs)).toEqual([]);
	});

	describe("map", () => {
		it("returns mapped underlying collection without filter", () => {
			wrapper = new CollectionWrapper(collection);
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'pineapple', 'orange', 'apple' ]);
		});

		it("adds new model to collection", () => {
			wrapper = new CollectionWrapper(collection);

			let onAdd = jest.fn();
			let passionfruit = { id: 50, fruit: 'passionfruit' };
			wrapper.on('add', onAdd);
			collection.add(passionfruit);
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'pineapple', 'orange', 'apple', 'passionfruit' ]);
			expect(onAdd).toHaveBeenCalledTimes(1);
			expect(onAdd.mock.calls[0][0]).toMatchObject({ idx: 4, item: passionfruit });
			wrapper.off('add', onAdd);
		});

		it("removes model from collection", () => {
			wrapper = new CollectionWrapper(collection);
			wrapper.on('remove', getIdx);
			collection.remove(20);
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'orange', 'apple' ]);
			expect(idx).toBe(1);
			wrapper.off('remove', getIdx);
		});
	});

	describe("filter", () => {
		it("returns filtered item set", () => {
			wrapper = new CollectionWrapper(collection);
			expect(wrapper.filter(m => m.fruit.length <= 6).map(m => m.fruit)).toEqual([ 'banana', 'orange', 'apple' ]);
		});
	});

	describe("atIndex", () => {
		it("returns the item found at index", () => {
			wrapper = new CollectionWrapper(collection);
			expect(wrapper.atIndex(2)).toMatchObject(items[30]);
		});

		it("returns undefined when index is out of bounds", () => {
			wrapper = new CollectionWrapper(collection);
			expect(wrapper.atIndex(-1)).toBe(undefined);
			expect(wrapper.atIndex(collection.length)).toBe(undefined);
		});

		it("returns undefined when index is out of bounds of sliced collection", () => {
			wrapper = new CollectionWrapper(collection, {
				begin: 1,
				end: -1
			});
			expect(wrapper.atIndex(-1)).toBe(undefined);
			expect(wrapper.atIndex(collection.length - 2)).toBe(undefined);
		});

		it("returns the item found at index with filter", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			expect(wrapper.atIndex(2)).toMatchObject(items[40]);
		});
	});

	describe("indexOf", () => {
		it("returns the index of item in collection", () => {
			wrapper = new CollectionWrapper(collection);
			expect(wrapper.indexOf(collection.atIndex(2))).toBe(2);
		});

		it("returns the index of item in sliced collection", () => {
			wrapper = new CollectionWrapper(collection, {
				begin: 1,
				end: -1
			});
			expect(wrapper.indexOf(collection.atIndex(1))).toBe(0);
			expect(wrapper.indexOf(collection.atIndex(2))).toBe(1);
		});

		it("returns -1 when item is not in the collection", () => {
			wrapper = new CollectionWrapper(collection);
			expect(wrapper.indexOf(items[50])).toBe(-1);
		});

		it("returns -1 when item is not included in sliced collection", () => {
			wrapper = new CollectionWrapper(collection, {
				begin: 1,
				end: -1
			});
			expect(wrapper.indexOf(collection.atIndex(0))).toBe(-1);
			expect(wrapper.indexOf(collection.atIndex(3))).toBe(-1);
		});

		it("returns the index of item in filtered collection", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			expect(wrapper.indexOf(collection.atIndex(0))).toBe(0);
			expect(wrapper.indexOf(collection.atIndex(2))).toBe(1);
			expect(wrapper.indexOf(collection.atIndex(3))).toBe(2);
		});

		it("returns -1 when item is excluded from filtered collection", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			expect(wrapper.indexOf(collection.atIndex(1))).toBe(-1);
		});

		it("returns -1 when item is not in a filtered collection", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			expect(wrapper.indexOf(items[50])).toBe(-1);
		});
	});

	describe("opt.compare", () => {
		it("propagates a sorted collection", () => {
			wrapper = new CollectionWrapper(collection, {
				compare: (a, b) => a.fruit.localeCompare(b.fruit)
			});
			expect(wrapper.map(m => m.fruit)).toEqual([ 'apple', 'banana', 'orange', 'pineapple' ]);
		});

		it("adds new model in sorted collection", () => {
			wrapper = new CollectionWrapper(collection, {
				compare: (a, b) => a.fruit.localeCompare(b.fruit)
			});
			attachRecorder();
			collection.add({ id: 50, fruit: 'passionfruit' });
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'apple', 'banana', 'orange', 'passionfruit', 'pineapple' ]);
			expect(recordedEvents).toMatchObject([{ event: "add", idx: 3 }]);
		});

		it("removes model from sorted collection", () => {
			wrapper = new CollectionWrapper(collection, {
				compare: (a, b) => a.fruit.localeCompare(b.fruit)
			});
			attachRecorder();
			collection.remove(10);
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'apple', 'orange', 'pineapple' ]);
			expect(recordedEvents).toMatchObject([{ event: "remove", idx: 1 }]);
		});

		it("moves model from sorted collection on model change affecting sorting", () => {
			wrapper = new CollectionWrapper(collection, {
				compare: (a, b) => a.fruit.localeCompare(b.fruit)
			});
			attachRecorder();
			collection.get(10).set({ fruit: 'passionfruit' });
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'apple', 'orange', 'passionfruit', 'pineapple' ]);
			expect(recordedEvents).toMatchObject([
				{ event: 'remove', idx: 1 },
				{ event: 'add', idx: 2 }
			]);
		});

		it("emits no event from sorted collection on model change not affecting sorting", () => {
			wrapper = new CollectionWrapper(collection, {
				compare: (a, b) => a.fruit.localeCompare(b.fruit)
			});
			attachRecorder();
			collection.get(10).set({ fruit: 'kiwi' });
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'apple', 'kiwi', 'orange', 'pineapple' ]);
			expect(recordedEvents.length).toBe(0);
		});

		it("moves newly added model on model change affecting sorting", () => {
			wrapper = new CollectionWrapper(collection, {
				compare: (a, b) => a.fruit.localeCompare(b.fruit)
			});
			attachRecorder();
			collection.add(items[50]);
			jest.runAllTimers();
			collection.get(50).set({ fruit: 'passionfruit' });
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'apple', 'banana', 'orange', 'passionfruit', 'pineapple' ]);
			expect(recordedEvents).toMatchObject([
				{ event: "add", idx: 2 },
				{ event: "remove", idx: 2 },
				{ event: "add", idx: 3 },
			]);
		});
	});

	describe("opt.filter", () => {
		it("propagates a filtered collection", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'orange', 'apple' ]);
		});

		it("adds new model in filtered collection", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			attachRecorder();
			collection.add(items[50]);
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'orange', 'apple', 'kiwi' ]);
			expect(recordedEvents).toMatchObject([{ event: "add", idx: 3 }]);
		});

		it("removes model from filtered collection", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			attachRecorder();
			collection.remove(30);
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'apple' ]);
			expect(recordedEvents).toMatchObject([{ event: "remove", idx: 1 }]);
		});

		it("does not trigger event on adding filtered model to collection", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			attachRecorder();
			collection.add({ id: 50, fruit: 'passionfruit' });
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'orange', 'apple' ]);
			expect(recordedEvents.length).toBe(0);
		});

		it("does not trigger event on removing filtered model from collection", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			attachRecorder();
			collection.remove(20);
			jest.runAllTimers();
			expect(recordedEvents.length).toBe(0);
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'orange', 'apple' ]);
		});

		it("adds filtered model on model change making filter true", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			attachRecorder();
			let model = collection.get(20);
			model.set({ fruit: 'kiwi' });
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'kiwi', 'orange', 'apple' ]);
			expect(recordedEvents).toMatchObject([{ event: "add", idx: 1 }]);
		});

		it("removes filtered model on model change making filter false", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			attachRecorder();
			collection.get(10).set({ fruit: 'passionfruit' });
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'orange', 'apple' ]);
			expect(recordedEvents).toMatchObject([{ event: "remove", idx: 0 }]);
		});

		it("removes newly added model on model change making filter false", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			attachRecorder();
			collection.add(items[50]);
			jest.runAllTimers();
			collection.get(50).set({ fruit: 'passionfruit' });
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'orange', 'apple' ]);
			expect(recordedEvents).toMatchObject([
				{ event: "add", idx: 3 },
				{ event: "remove", idx: 3 }
			]);
		});

		it("adds newly added filtered model on model change making filter true", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			attachRecorder();
			collection.add({ id: 50, fruit: 'passionfruit' });
			jest.runAllTimers();
			collection.get(50).set({ fruit: 'kiwi' });
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual([ 'banana', 'orange', 'apple', 'kiwi' ]);
			expect(recordedEvents).toMatchObject([
				{ event: "add", idx: 3 }
			]);
		});
	});

	describe("opt.map", () => {
		it("propagates a mapped collection", () => {
			wrapper = new CollectionWrapper(collection, {
				map: m => ({ id: m.id, fruit: m.fruit.toUpperCase() })
			});
			expect(wrapper.map(m => m.fruit)).toEqual([ 'BANANA', 'PINEAPPLE', 'ORANGE', 'APPLE' ]);
		});

		it("replaces mapped value on model change", () => {
			wrapper = new CollectionWrapper(collection, {
				map: m => m.fruit
			});
			attachRecorder();
			let model = collection.get(20);
			model.set({ fruit: 'kiwi' });
			jest.runAllTimers();
			expect(wrapper.toArray()).toEqual([ 'banana', 'kiwi', 'orange', 'apple' ]);
			expect(recordedEvents).toMatchObject([
				{ event: 'remove', idx: 1, item: 'pineapple' },
				{ event: 'add', idx: 1, item: 'kiwi' }
			]);
		});

		it("replaces mapped value on newly added model after model changed", () => {
			wrapper = new CollectionWrapper(collection, {
				map: m => m.fruit
			});
			attachRecorder();
			collection.add({ id: 50, fruit: 'passionfruit' });
			jest.runAllTimers();
			collection.get(50).set({ fruit: 'kiwi' });
			jest.runAllTimers();
			expect(wrapper.toArray()).toEqual([ 'banana', 'pineapple', 'orange', 'apple', 'kiwi' ]);
			expect(recordedEvents).toMatchObject([
				{ event: 'add', idx: 4, item: 'passionfruit' },
				{ event: 'remove', idx: 4, item: 'passionfruit' },
				{ event: 'add', idx: 4, item: 'kiwi' }
			]);
		});
	});

	describe("opt.begin", () => {
		test.each([
			[ 0, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			[ 1, [ 'pineapple', 'orange', 'apple' ]],
			[ 3, [ 'apple' ]],
			[ 4, []],
			[ 5, []],
			[ -1, [ 'apple' ]],
			[ -3, [ 'pineapple', 'orange', 'apple' ]],
			[ -4, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			[ -5, [ 'banana', 'pineapple', 'orange', 'apple' ]],
		])("given opt.begin=%i, mapped fruits equals %p", (begin, expected) => {
			wrapper = new CollectionWrapper(collection, {
				begin
			});
			expect(wrapper.map(m => m.fruit)).toEqual(expected);
		});
	});

	describe("opt.end", () => {
		test.each([
			[ 0, []],
			[ 1, [ 'banana' ]],
			[ 3, [ 'banana', 'pineapple', 'orange' ]],
			[ 4, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			[ 5, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			[ -1, [ 'banana', 'pineapple', 'orange' ]],
			[ -3, [ 'banana' ]],
			[ -4, []],
			[ -5, []],
		])("given opt.end=%i, mapped fruits equals %p", (end, expected) => {
			wrapper = new CollectionWrapper(collection, {
				end
			});
			expect(wrapper.map(m => m.fruit)).toEqual(expected);
		});
	});

	describe("opt.begin & opt.end", () => {
		test.each([
			[ 1, 0, []],
			[ 1, 1, []],
			[ 1, 3, [ 'pineapple', 'orange' ]],
			[ 1, 5, [ 'pineapple', 'orange', 'apple' ]],
			[ 1, -4, []],
			[ 1, -2, [ 'pineapple' ]],
			[ 1, -1, [ 'pineapple', 'orange' ]],
			[ 2, 0, []],
			[ 2, 2, []],
			[ 2, 3, [ 'orange' ]],
			[ 2, -4, []],
			[ 2, -1, [ 'orange' ]],
			[ 4, 0, []],
			[ 4, 5, []],
			[ -4, 0, []],
			[ -4, 1, [ 'banana' ]],
			[ -4, 3, [ 'banana', 'pineapple', 'orange' ]],
			[ -4, 5, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			[ -4, -4, []],
			[ -4, -2, [ 'banana', 'pineapple' ]],
			[ -4, -1, [ 'banana', 'pineapple', 'orange' ]],
			[ -2, 0, []],
			[ -2, 2, []],
			[ -2, 3, [ 'orange' ]],
			[ -2, -4, []],
			[ -2, -1, [ 'orange' ]],
			[ -1, 0, []],
			[ -1, 5, [ 'apple' ]],
		])("given opt.begin=%i, and opt.end=%i, mapped fruits equals %p", (begin, end, expected) => {
			wrapper = new CollectionWrapper(collection, {
				begin,
				end
			});
			expect(wrapper.map(m => m.fruit)).toEqual(expected);
		});
	});

	describe("opt.begin & opt.end", () => {
		test.each([
			[ 1, 0, []],
			[ 1, 1, []],
			[ 1, 3, [ 'pineapple', 'orange' ]],
			[ 1, 5, [ 'pineapple', 'orange', 'apple' ]],
			[ 1, -4, []],
			[ 1, -2, [ 'pineapple' ]],
			[ 1, -1, [ 'pineapple', 'orange' ]],
			[ 2, 0, []],
			[ 2, 2, []],
			[ 2, 3, [ 'orange' ]],
			[ 2, -4, []],
			[ 2, -1, [ 'orange' ]],
			[ 4, 0, []],
			[ 4, 5, []],
			[ -4, 0, []],
			[ -4, 1, [ 'banana' ]],
			[ -4, 3, [ 'banana', 'pineapple', 'orange' ]],
			[ -4, 5, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			[ -4, -4, []],
			[ -4, -2, [ 'banana', 'pineapple' ]],
			[ -4, -1, [ 'banana', 'pineapple', 'orange' ]],
			[ -2, 0, []],
			[ -2, 2, []],
			[ -2, 3, [ 'orange' ]],
			[ -2, -4, []],
			[ -2, -1, [ 'orange' ]],
			[ -1, 0, []],
			[ -1, 5, [ 'apple' ]],
		])("given opt.begin=%i, and opt.end=%i, mapped fruits equals %p", (begin, end, expected) => {
			wrapper = new CollectionWrapper(collection, {
				begin,
				end
			});
			expect(wrapper.map(m => m.fruit)).toEqual(expected);
			// Test iterator
			let list = [];
			for (let item of wrapper) {
				list.push(item.fruit);
			}
			expect(list).toEqual(expected);
		});
	});

	describe("add event on sliced collection", () => {
		test.each([
			// No slicing
			[ 0, null, 0, [ 'kiwi', 'banana', 'pineapple', 'orange', 'apple' ]],
			// Begin bound to start
			[ 0, null, 2, [ 'banana', 'pineapple', 'kiwi', 'orange', 'apple' ]],
			[ 0, null, 4, [ 'banana', 'pineapple', 'orange', 'apple', 'kiwi' ]],
			[ 1, null, 0, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			[ 1, null, 2, [ 'pineapple', 'kiwi', 'orange', 'apple' ]],
			[ 1, null, 4, [ 'pineapple', 'orange', 'apple', 'kiwi' ]],
			[ 4, null, 0, [ 'apple' ]],
			[ 4, null, 2, [ 'apple' ]],
			[ 4, null, 4, [ 'kiwi' ]],
			[ 5, null, 2, []],
			[ 6, null, 2, []],
			// Begin bound to end
			[ -6, null, 0, [ 'kiwi', 'banana', 'pineapple', 'orange', 'apple' ]],
			[ -6, null, 2, [ 'banana', 'pineapple', 'kiwi', 'orange', 'apple' ]],
			[ -6, null, 4, [ 'banana', 'pineapple', 'orange', 'apple', 'kiwi' ]],
			[ -5, null, 0, [ 'kiwi', 'banana', 'pineapple', 'orange', 'apple' ]],
			[ -5, null, 2, [ 'banana', 'pineapple', 'kiwi', 'orange', 'apple' ]],
			[ -5, null, 4, [ 'banana', 'pineapple', 'orange', 'apple', 'kiwi' ]],
			[ -3, null, 0, [ 'pineapple', 'orange', 'apple' ]],
			[ -3, null, 2, [ 'kiwi', 'orange', 'apple' ]],
			[ -3, null, 4, [ 'orange', 'apple', 'kiwi' ]],
			[ -1, null, 0, [ 'apple' ]],
			[ -1, null, 2, [ 'apple' ]],
			[ -1, null, 4, [ 'kiwi' ]],
			// End bound to start
			[ 0, 0, 0, []],
			[ 0, 0, 2, []],
			[ 0, 0, 4, []],
			[ 0, 1, 0, [ 'kiwi' ]],
			[ 0, 1, 2, [ 'banana' ]],
			[ 0, 1, 4, [ 'banana' ]],
			[ 0, 4, 0, [ 'kiwi', 'banana', 'pineapple', 'orange' ]],
			[ 0, 4, 2, [ 'banana', 'pineapple', 'kiwi', 'orange' ]],
			[ 0, 4, 4, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			[ 0, 5, 0, [ 'kiwi', 'banana', 'pineapple', 'orange', 'apple' ]],
			[ 0, 5, 4, [ 'banana', 'pineapple', 'orange', 'apple', 'kiwi' ]],
			[ 0, 6, 0, [ 'kiwi', 'banana', 'pineapple', 'orange', 'apple' ]],
			[ 0, 6, 4, [ 'banana', 'pineapple', 'orange', 'apple', 'kiwi' ]],
			// End bound to end
			[ 0, -6, 0, []],
			[ 0, -6, 4, []],
			[ 0, -5, 0, []],
			[ 0, -5, 4, []],
			[ 0, -4, 0, [ 'kiwi' ]],
			[ 0, -4, 1, [ 'banana' ]],
			[ 0, -4, 4, [ 'banana' ]],
			[ 0, -3, 0, [ 'kiwi', 'banana' ]],
			[ 0, -3, 1, [ 'banana', 'kiwi' ]],
			[ 0, -3, 2, [ 'banana', 'pineapple' ]],
			[ 0, -3, 4, [ 'banana', 'pineapple' ]],
			[ 0, -1, 0, [ 'kiwi', 'banana', 'pineapple', 'orange' ]],
			[ 0, -1, 2, [ 'banana', 'pineapple', 'kiwi', 'orange' ]],
			[ 0, -1, 4, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			// Begin bound to start and end bound to start
			[ 0, 0, 2, []],
			[ 3, 1, 2, []],
			[ 1, 3, 0, [ 'banana', 'pineapple' ]],
			[ 1, 3, 2, [ 'pineapple', 'kiwi' ]],
			[ 1, 3, 4, [ 'pineapple', 'orange' ]],
			[ 2, 2, 0, []],
			[ 2, 4, 0, [ 'pineapple', 'orange' ]],
			[ 2, 4, 2, [ 'kiwi', 'orange' ]],
			[ 2, 4, 4, [ 'orange', 'apple' ]],
			[ 4, 5, 2, [ 'apple' ]],
			[ 4, 5, 4, [ 'kiwi' ]],
			[ 4, 6, 2, [ 'apple' ]],
			[ 4, 6, 4, [ 'kiwi' ]],
			[ 5, 6, 4, []],
			// Begin bound to end and end bound to start
			[ -6, 1, 0, [ 'kiwi' ]],
			[ -6, 1, 4, [ 'banana' ]],
			[ -6, 6, 2, [ 'banana', 'pineapple', 'kiwi', 'orange', 'apple' ]],
			[ -5, 1, 0, [ 'kiwi' ]],
			[ -5, 1, 1, [ 'banana' ]],
			[ -3, 1, 4, []],
			[ -3, 2, 0, []],
			[ -3, 2, 1, []],
			[ -3, 3, 0, [ 'pineapple' ]],
			[ -3, 3, 2, [ 'kiwi' ]],
			[ -3, 3, 4, [ 'orange' ]],
			[ -2, 5, 0, [ 'orange', 'apple' ]],
			[ -2, 5, 4, [ 'apple', 'kiwi' ]],
			[ -1, 1, 0, []],
			[ -1, 1, 4, []],
			[ -1, 6, 0, [ 'apple' ]],
			[ -1, 6, 4, [ 'kiwi' ]],
			// Begin bound to start and end bound to end
			[ 2, -5, 0, []],
			[ 2, -5, 2, []],
			[ 2, -5, 4, []],
			[ 2, -3, 0, []],
			[ 2, -3, 2, []],
			[ 2, -3, 4, []],
			[ 2, -1, 0, [ 'pineapple', 'orange' ]],
			[ 2, -1, 2, [ 'kiwi', 'orange' ]],
			[ 2, -1, 4, [ 'orange', 'apple' ]],
			[ 4, -1, 0, []],
			[ 4, -1, 4, []],
			[ 5, -1, 4, []],
			// Begin bound to end and end bound to end
			[ -6, -6, 0, []],
			[ -6, -4, 0, [ 'kiwi' ]],
			[ -6, -4, 1, [ 'banana' ]],
			[ -5, -6, 0, []],
			[ -5, -4, 0, [ 'kiwi' ]],
			[ -5, -4, 1, [ 'banana' ]],
			[ -3, -3, 2, []],
			[ -3, -3, 3, []],
			[ -3, -1, 0, [ 'pineapple', 'orange' ]],
			[ -3, -1, 2, [ 'kiwi', 'orange' ]],
			[ -3, -1, 4, [ 'orange', 'apple' ]],
		])("given opt.begin=%i, and opt.end=%p, with 'kiwi' added at idx=%i, mapped fruits equals %p", (begin, end, idx, expected) => {
			wrapper = new CollectionWrapper(collection, {
				begin,
				end
			});
			attachRecorder();
			let arr = wrapper.toArray();
			let kiwi = { id: 50, fruit: 'kiwi' };
			collection.add(kiwi, idx);
			jest.runAllTimers();
			try {
				expect(wrapper.map(m => m.fruit)).toEqual(expected);
				expect(wrapper.length).toEqual(expected.length);
				for (let e of recordedEvents) {
					switch (e.event) {
						case 'add':
							expect(e.idx >= 0 && e.idx <= arr.length).toBe(true);
							arr.splice(e.idx, 0, e.item);
							break;
						case 'remove':
							expect(e.idx >= 0 && e.idx < arr.length).toBe(true);
							expect(e.item.fruit).toBe(arr[e.idx].fruit);
							arr.splice(e.idx, 1);
							break;
					}
				}
				expect(arr.map(m => m.fruit)).toEqual(expected);
			} catch (err) {
				err.message = `${err.message}\n\nevents:\n\t${JSON.stringify(recordedEvents.map(e => ({ event: e.event, idx: e.idx, fruit: e.item.fruit })), null, 2)}`;
				throw err;
			}
		});
	});

	describe("remove event on sliced collection", () => {
		test.each([
			// No slicing
			[ 0, null, 0, [ 'pineapple', 'orange', 'apple' ]],
			[ 0, null, 2, [ 'banana', 'pineapple', 'apple' ]],
			[ 0, null, 3, [ 'banana', 'pineapple', 'orange' ]],
			// Begin bound to start
			[ 1, null, 0, [ 'orange', 'apple' ]],
			[ 1, null, 2, [ 'pineapple', 'apple' ]],
			[ 1, null, 3, [ 'pineapple', 'orange' ]],
			[ 2, null, 0, [ 'apple' ]],
			[ 2, null, 3, [ 'orange' ]],
			[ 4, null, 3, []],
			// Begin bound to end
			[ -5, null, 0, [ 'pineapple', 'orange', 'apple' ]],
			[ -5, null, 3, [ 'banana', 'pineapple', 'orange' ]],
			[ -4, null, 0, [ 'pineapple', 'orange', 'apple' ]],
			[ -4, null, 3, [ 'banana', 'pineapple', 'orange' ]],
			[ -2, null, 0, [ 'orange', 'apple' ]],
			[ -2, null, 1, [ 'orange', 'apple' ]],
			[ -2, null, 2, [ 'pineapple', 'apple' ]],
			[ -2, null, 3, [ 'pineapple', 'orange' ]],
			[ -1, null, 0, [ 'apple' ]],
			[ -1, null, 3, [ 'orange' ]],
			// End bound to start
			[ 0, 0, 0, []],
			[ 0, 0, 2, []],
			[ 0, 0, 3, []],
			[ 0, 1, 0, [ 'pineapple' ]],
			[ 0, 1, 2, [ 'banana' ]],
			[ 0, 1, 3, [ 'banana' ]],
			[ 0, 3, 0, [ 'pineapple', 'orange', 'apple' ]],
			[ 0, 3, 2, [ 'banana', 'pineapple', 'apple' ]],
			[ 0, 3, 3, [ 'banana', 'pineapple', 'orange' ]],
			[ 0, 4, 2, [ 'banana', 'pineapple', 'apple' ]],
			[ 0, 4, 3, [ 'banana', 'pineapple', 'orange' ]],
			[ 0, 5, 0, [ 'pineapple', 'orange', 'apple' ]],
			[ 0, 6, 3, [ 'banana', 'pineapple', 'orange' ]],
			// End bound to end
			[ 0, -4, 0, []],
			[ 0, -4, 3, []],
			[ 0, -3, 0, []],
			[ 0, -3, 1, []],
			[ 0, -3, 3, []],
			[ 0, -2, 0, [ 'pineapple' ]],
			[ 0, -2, 2, [ 'banana' ]],
			[ 0, -2, 3, [ 'banana' ]],
			[ 0, -1, 0, [ 'pineapple', 'orange' ]],
			[ 0, -1, 1, [ 'banana', 'orange' ]],
			[ 0, -1, 2, [ 'banana', 'pineapple' ]],
			[ 0, -1, 3, [ 'banana', 'pineapple' ]],
			// Begin bound to start and end bound to start
			[ 0, 0, 2, []],
			[ 3, 1, 2, []],
			[ 1, 2, 3, [ 'pineapple' ]],
			[ 1, 3, 0, [ 'orange', 'apple' ]],
			[ 1, 3, 2, [ 'pineapple', 'apple' ]],
			[ 1, 3, 3, [ 'pineapple', 'orange' ]],
			[ 2, 2, 0, []],
			[ 2, 4, 0, [ 'apple' ]],
			[ 2, 4, 2, [ 'apple' ]],
			[ 2, 4, 3, [ 'orange' ]],
			[ 3, 4, 0, []],
			[ 3, 4, 2, []],
			[ 3, 4, 3, []],
			[ 4, 5, 0, []],
			[ 4, 5, 3, []],
			// Begin bound to end and end bound to start
			[ -5, 1, 0, [ 'pineapple' ]],
			[ -5, 1, 1, [ 'banana' ]],
			[ -4, 1, 0, [ 'pineapple' ]],
			[ -4, 1, 1, [ 'banana' ]],
			[ -3, 1, 0, [ 'pineapple' ]],
			[ -3, 1, 1, [ 'banana' ]],
			[ -3, 3, 0, [ 'pineapple', 'orange', 'apple' ]],
			[ -3, 3, 2, [ 'banana', 'pineapple', 'apple' ]],
			[ -3, 3, 3, [ 'banana', 'pineapple', 'orange' ]],
			[ -2, 1, 0, []],
			[ -2, 1, 1, []],
			[ -2, 1, 2, []],
			[ -2, 1, 3, []],
			[ -1, 4, 2, [ 'apple' ]],
			[ -1, 4, 3, [ 'orange' ]],
			[ -1, 5, 2, [ 'apple' ]],
			[ -1, 5, 3, [ 'orange' ]],
			// Begin bound to start and end bound to end
			[ 2, -5, 0, []],
			[ 2, -5, 2, []],
			[ 2, -4, 0, []],
			[ 2, -4, 2, []],
			[ 2, -1, 0, []],
			[ 2, -1, 1, []],
			[ 2, -1, 2, []],
			[ 1, -1, 0, [ 'orange' ]],
			[ 1, -1, 1, [ 'orange' ]],
			[ 1, -1, 2, [ 'pineapple' ]],
			[ 1, -1, 3, [ 'pineapple' ]],
			[ 3, -1, 2, []],
			[ 3, -1, 3, []],
			[ 4, -1, 3, []],
			// Begin bound to end and end bound to end
			[ -5, -5, 0, []],
			[ -4, -3, 0, []],
			[ -3, -3, 0, []],
			[ -3, -2, 0, [ 'pineapple' ]],
			[ -3, -2, 1, [ 'banana' ]],
			[ -3, -2, 3, [ 'banana' ]],
			[ -3, -1, 0, [ 'pineapple', 'orange' ]],
			[ -3, -1, 1, [ 'banana', 'orange' ]],
			[ -3, -1, 2, [ 'banana', 'pineapple' ]],
			[ -3, -1, 3, [ 'banana', 'pineapple' ]],
			[ -2, -3, 2, []],
			[ -2, -2, 2, []],
			[ -2, -2, 3, []],
			[ -2, -1, 0, [ 'orange' ]],
			[ -2, -1, 1, [ 'orange' ]],
			[ -2, -1, 2, [ 'pineapple' ]],
			[ -2, -1, 3, [ 'pineapple' ]],
			[ -1, -1, 0, []],
			[ -1, -1, 3, []],
			[ -1, -3, 1, []],
		])("given opt.begin=%i, and opt.end=%p, with remove at idx=%i, mapped fruits equals %p", (begin, end, idx, expected) => {
			wrapper = new CollectionWrapper(collection, {
				begin,
				end
			});
			attachRecorder();
			let arr = wrapper.toArray();
			collection.remove(collection.atIndex(idx).id);
			jest.runAllTimers();
			try {
				expect(wrapper.map(m => m.fruit)).toEqual(expected);
				expect(wrapper.length).toEqual(expected.length);
				for (let e of recordedEvents) {
					switch (e.event) {
						case 'add':
							expect(e.idx >= 0 && e.idx <= arr.length).toBe(true);
							arr.splice(e.idx, 0, e.item);
							break;
						case 'remove':
							expect(e.idx >= 0 && e.idx < arr.length).toBe(true);
							expect(e.item.fruit).toBe(arr[e.idx].fruit);
							arr.splice(e.idx, 1);
							break;
					}
				}
				expect(arr.map(m => m.fruit)).toEqual(expected);
			} catch (err) {
				err.message = `${err.message}\n\nevents:\n\t${JSON.stringify(recordedEvents.map(e => ({ event: e.event, idx: e.idx, fruit: e.item.fruit })), null, 2)}`;
				throw err;
			}
		});
	});

	describe("iterator", () => {
		it("iterates over each item in collection", () => {
			wrapper = new CollectionWrapper(collection);
			let arr = wrapper.toArray();
			for (let item of wrapper) {
				let expected = arr.shift();
				expect(item).toBe(expected);
			}
			expect(arr.length).toBe(0);
		});

		it("iterates over each item in filtered collection", () => {
			wrapper = new CollectionWrapper(collection, {
				filter: m => m.fruit.length <= 6
			});
			let arr = wrapper.toArray();
			for (let item of wrapper) {
				let expected = arr.shift();
				expect(item).toBe(expected);
			}
			expect(arr.length).toBe(0);
		});
	});

});
