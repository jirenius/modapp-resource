import eventBus from 'modapp/eventBus';
import Model from './Model';
import ModelCollection from './Collection';
import CollectionWrapper from './CollectionWrapper';

describe("CollectionWrapper", () => {
	let collection;
	let wrapper;
	let idx;
	let getIdx;

	jest.useFakeTimers();

	beforeEach(() => {
		collection = new ModelCollection(eventBus, 'collection', {
			modelFactory: item => new Model(eventBus, 'model', {data: item}),
			data: [
				{id: 10, fruit: 'banana'},
				{id: 20, fruit: 'pineapple'},
				{id: 30, fruit: 'orange'},
				{id: 40, fruit: 'apple'}
			]
		});

		idx = null;
		getIdx = jest.fn(e => idx = e.idx);
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.dispose();
			wrapper = null;
		}
	});

	describe("map", () => {
		it("returns mapped underlying collection without filter", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper');
			expect(wrapper.map(m => m.fruit)).toEqual(['banana', 'pineapple', 'orange', 'apple']);
		});

		it("adds new model to collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper');

			let idx;
			wrapper.on('add', e => idx = e.idx);
			collection.add({id: 50, fruit: 'passionfruit'});
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual(['banana', 'pineapple', 'orange', 'apple', 'passionfruit']);
			expect(idx).toBe(4);
		});

		it("removes model from collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper');
			wrapper.on('remove', getIdx);
			collection.remove(20);
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual(['banana', 'orange', 'apple']);
			expect(idx).toBe(1);
		});
	});

	describe("opt.compare", () => {
		it("propagates a sorted collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				compare: (a, b) => a.fruit.localeCompare(b.fruit)
			});
			expect(wrapper.map(m => m.fruit)).toEqual(['apple', 'banana', 'orange', 'pineapple']);
		});

		it("adds new model in sorted collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				compare: (a, b) => a.fruit.localeCompare(b.fruit)
			});
			wrapper.on('add', getIdx);
			collection.add({id: 50, fruit: 'passionfruit'});
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual(['apple', 'banana', 'orange', 'passionfruit', 'pineapple']);
			expect(idx).toBe(3);
		});

		it("removes model from sorted collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				compare: (a, b) => a.fruit.localeCompare(b.fruit)
			});
			wrapper.on('remove', getIdx);
			collection.remove(10);
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual(['apple', 'orange', 'pineapple']);
			expect(idx).toBe(1);
		});
	});

	describe("opt.filter", () => {
		it("propagates a filtered collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				filter: m => m.fruit.length <= 6
			});
			expect(wrapper.map(m => m.fruit)).toEqual(['banana', 'orange', 'apple']);
		});

		it("adds new model in filtered collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				filter: m => m.fruit.length <= 6
			});
			wrapper.on('add', getIdx);
			collection.add({id: 50, fruit: 'kiwi'});
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual(['banana', 'orange', 'apple', 'kiwi']);
			expect(idx).toBe(3);
		});

		it("removes model from filtered collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				filter: m => m.fruit.length <= 6
			});
			wrapper.on('remove', getIdx);
			collection.remove(30);
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual(['banana', 'apple']);
			expect(idx).toBe(1);
		});

		it("does not trigger event on adding filtered model to collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				filter: m => m.fruit.length <= 6
			});
			wrapper.on('add', getIdx);
			collection.add({id: 50, fruit: 'passionfruit'});
			jest.runAllTimers();
			expect(getIdx).not.toBeCalled();
			expect(wrapper.map(m => m.fruit)).toEqual(['banana', 'orange', 'apple']);
		});

		it("does not trigger event on removing filtered model from collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				filter: m => m.fruit.length <= 6
			});
			wrapper.on('remove', getIdx);
			collection.remove(20);
			jest.runAllTimers();
			expect(getIdx).not.toBeCalled();
			expect(wrapper.map(m => m.fruit)).toEqual(['banana', 'orange', 'apple']);
		});

		it("adds filtered model in on model change", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				filter: m => m.fruit.length <= 6
			});
			wrapper.on('add', getIdx);
			let model = collection.get(20);
			model.set({fruit: 'kiwi'});
			jest.runAllTimers();
			expect(wrapper.map(m => m.fruit)).toEqual(['banana', 'kiwi', 'orange', 'apple']);
			expect(idx).toBe(1);
		});
	});

	describe("opt.map", () => {
		it("propagates a mapped collection", () => {
			wrapper = new CollectionWrapper(collection, eventBus, 'wrapper', {
				map: m => ({id: m.id, fruit: m.fruit.toUpperCase()})
			});
			expect(wrapper.map(m => m.fruit)).toEqual(['BANANA', 'PINEAPPLE', 'ORANGE', 'APPLE']);
		});
	});
});