import Model from './Model';
import ModelToCollection from './ModelToCollection';

describe("ModelToCollection", () => {
	let items;
	let models;
	let model;
	let nestedModel;
	let collection;
	let recordedEvents;
	let eventRecorder = (event) => jest.fn(e => recordedEvents.push(Object.assign(e, { event })));

	jest.useFakeTimers();

	beforeEach(() => {
		items = {
			10: { id: 10, fruit: 'banana', hidden: true },
			20: { id: 20, fruit: 'pineapple' },
			30:	{ id: 30, fruit: 'orange', hidden: true },
			40:	{ id: 40, fruit: 'apple' },
			50:	{ id: 50, fruit: 'kiwi' }
		};
		models = {
			10: new Model({ data: items[10] }),
			20: new Model({ data: items[20] }),
			30: new Model({ data: items[30] }),
			40: new Model({ data: items[40] }),
			50: new Model({ data: items[50] }),
		};
		model = new Model({ data: {
			40: items[40],
			30: items[30],
			20: items[20],
			10: items[10],
		}});
		nestedModel = new Model({ data: {
			10: models[10],
			20: models[20],
			30: models[30],
			40: models[40],
		}});

		recordedEvents = [];
	});

	afterEach(() => {
		if (collection) {
			collection.dispose();
			collection = null;
		}
	});

	describe("toArray", () => {
		it("returns array of collection items in correct order", () => {
			collection = new ModelToCollection(model);
			expect(collection.toArray().map(m => m.fruit)).toEqual([ 'banana', 'pineapple', 'orange', 'apple' ]);
		});
	});

	describe("model change event", () => {
		test.each([
			// No change
			[{}, [ 'banana', 'pineapple', 'orange', 'apple' ]],
			// Added item
			[{ 5: { id: 5, fruit: 'kiwi' }}, [ 'kiwi', 'banana', 'pineapple', 'orange', 'apple' ]],
			[{ 25: { id: 25, fruit: 'kiwi' }}, [ 'banana', 'pineapple', 'kiwi', 'orange', 'apple' ]],
			[{ 50: { id: 50, fruit: 'kiwi' }}, [ 'banana', 'pineapple', 'orange', 'apple', 'kiwi' ]],
			// Removed item
			[{ 10: undefined }, [ 'pineapple', 'orange', 'apple' ]],
			[{ 20: undefined }, [ 'banana', 'orange', 'apple' ]],
			[{ 40: undefined }, [ 'banana', 'pineapple', 'orange' ]],
			// Moved item
			[{ 10: { id: 25, fruit: 'banana' }}, [ 'pineapple', 'banana', 'orange', 'apple' ]],
			[{ 10: { id: 50, fruit: 'banana' }}, [ 'pineapple', 'orange', 'apple', 'banana' ]],
			[{ 20: { id: 5, fruit: 'pineapple' }}, [ 'pineapple', 'banana', 'orange', 'apple' ]],
			[{ 20: { id: 50, fruit: 'pineapple' }}, [ 'banana', 'orange', 'apple', 'pineapple' ]],
			[{ 40: { id: 5, fruit: 'apple' }}, [ 'apple', 'banana', 'pineapple', 'orange' ]],
			[{ 40: { id: 25, fruit: 'apple' }}, [ 'banana', 'pineapple', 'apple', 'orange' ]],
			// Changed item
			[{ 10: { id: 10, fruit: 'kiwi' }}, [ 'kiwi', 'pineapple', 'orange', 'apple' ]],
			[{ 20: { id: 20, fruit: 'kiwi' }}, [ 'banana', 'kiwi', 'orange', 'apple' ]],
			[{ 40: { id: 40, fruit: 'kiwi' }}, [ 'banana', 'pineapple', 'orange', 'kiwi' ]],
		])("given model set event=%o, results in mapped fruits equals %p", (event, expected) => {
			collection = new ModelToCollection(model, {
				compare: (a, b) => a.value.id - b.value.id
			});
			collection.on('add', eventRecorder('add'));
			collection.on('remove', eventRecorder('remove'));

			let arr = collection.toArray();

			model.set(event);

			jest.runAllTimers();
			try {
				expect(collection.toArray().map(m => m.fruit)).toEqual(expected);
				expect(collection.length).toEqual(expected.length);
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

	describe("model change event with filter", () => {
		test.each([
			// No change
			[{}, [ 'pineapple', 'apple' ]],
			// Added item
			[{ 5: { id: 5, fruit: 'kiwi' }}, [ 'kiwi', 'pineapple', 'apple' ]],
			[{ 25: { id: 25, fruit: 'kiwi' }}, [ 'pineapple', 'kiwi', 'apple' ]],
			[{ 50: { id: 50, fruit: 'kiwi' }}, [ 'pineapple', 'apple', 'kiwi' ]],
			// Removed item
			[{ 10: undefined }, [ 'pineapple', 'apple' ]],
			[{ 20: undefined }, [ 'apple' ]],
			[{ 40: undefined }, [ 'pineapple' ]],
			// Moved item
			[{ 10: { id: 25, fruit: 'banana', hidden: true }}, [ 'pineapple', 'apple' ]],
			[{ 10: { id: 50, fruit: 'banana', hidden: true }}, [ 'pineapple', 'apple' ]],
			[{ 20: { id: 5, fruit: 'pineapple' }}, [ 'pineapple', 'apple' ]],
			[{ 20: { id: 50, fruit: 'pineapple' }}, [ 'apple', 'pineapple' ]],
			[{ 40: { id: 5, fruit: 'apple' }}, [ 'apple', 'pineapple' ]],
			[{ 40: { id: 25, fruit: 'apple' }}, [ 'pineapple', 'apple' ]],
			// Changed item
			[{ 10: { id: 10, fruit: 'kiwi', hidden: true }}, [ 'pineapple', 'apple' ]],
			[{ 20: { id: 20, fruit: 'kiwi' }}, [ 'kiwi', 'apple' ]],
			[{ 40: { id: 40, fruit: 'kiwi' }}, [ 'pineapple', 'kiwi' ]],
			// Changed hidden property
			[{ 10: { id: 10, fruit: 'banana', hidden: false }}, [ 'banana', 'pineapple', 'apple' ]],
			[{ 20: { id: 20, fruit: 'pineapple', hidden: true }}, [ 'apple' ]],
			[{ 30:	{ id: 30, fruit: 'orange', hidden: false }}, [ 'pineapple', 'orange', 'apple' ]],
			[{ 40:	{ id: 40, fruit: 'apple', hidden: true }}, [ 'pineapple' ]],
		])("given model set event=%o, results in mapped fruits equals %p", (event, expected) => {
			collection = new ModelToCollection(model, {
				compare: (a, b) => a.value.id - b.value.id,
				filter: (k, v) => !v.hidden
			});
			collection.on('add', eventRecorder('add'));
			collection.on('remove', eventRecorder('remove'));

			let arr = collection.toArray();

			model.set(event);

			jest.runAllTimers();
			try {
				expect(collection.toArray().map(m => m.fruit)).toEqual(expected);
				expect(collection.length).toEqual(expected.length);
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

	describe("nested model change event", () => {
		test.each([
			// No change
			[ null, {}, [ 'apple', 'banana', 'orange', 'pineapple' ]],
			// Updates of first item (40 = apple)
			[ 40, { fruit: 'aubergine' }, [ 'aubergine', 'banana', 'orange', 'pineapple' ]],
			[ 40, { fruit: 'kiwi' }, [ 'banana', 'kiwi', 'orange', 'pineapple' ]],
			[ 40, { fruit: 'pasta' }, [ 'banana', 'orange', 'pasta', 'pineapple' ]],
			[ 40, { fruit: 'tomato' }, [ 'banana', 'orange', 'pineapple', 'tomato' ]],
			// Updates of mid item (10 = banana)
			[ 10, { fruit: 'abiu' }, [ 'abiu', 'apple', 'orange', 'pineapple' ]],
			[ 10, { fruit: 'kiwi' }, [ 'apple', 'kiwi', 'orange', 'pineapple' ]],
			[ 10, { fruit: 'pasta' }, [ 'apple', 'orange', 'pasta', 'pineapple' ]],
			[ 10, { fruit: 'tomato' }, [ 'apple', 'orange', 'pineapple', 'tomato' ]],
			// Updates of last item (20 = pineapple)
			[ 20, { fruit: 'abiu' }, [ 'abiu', 'apple', 'banana', 'orange' ]],
			[ 20, { fruit: 'kiwi' }, [ 'apple', 'banana', 'kiwi', 'orange' ]],
			[ 20, { fruit: 'tomato' }, [ 'apple', 'banana', 'orange', 'tomato' ]],
		])("given model %s change event=%o, results in mapped fruits equals %p", (modelId, event, expected) => {
			collection = new ModelToCollection(nestedModel, {
				compare: (a, b) => a.value.fruit.localeCompare(b.value.fruit)
			});
			collection.on('add', eventRecorder('add'));
			collection.on('remove', eventRecorder('remove'));

			let arr = collection.toArray();

			if (modelId !== null) {
				models[modelId].set(event);
			}

			jest.runAllTimers();
			try {
				expect(collection.toArray().map(m => m.fruit)).toEqual(expected);
				expect(collection.length).toEqual(expected.length);
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

	describe("nested model change event with filter", () => {
		test.each([
			// No change
			[ null, {}, [ 'apple', 'pineapple' ], 0 ],
			// Updates of first item (40 = apple)
			[ 40, { fruit: 'aubergine' }, [ 'aubergine', 'pineapple' ], 0 ],
			[ 40, { fruit: 'kiwi' }, [ 'kiwi', 'pineapple' ], 0 ],
			[ 40, { fruit: 'pasta' }, [ 'pasta', 'pineapple' ], 0 ],
			[ 40, { fruit: 'tomato' }, [ 'pineapple', 'tomato' ], 2 ],
			// Updates of mid item (10 = banana)
			[ 10, { fruit: 'abiu' }, [ 'apple', 'pineapple' ], 0 ],
			[ 10, { fruit: 'kiwi' }, [ 'apple', 'pineapple' ], 0 ],
			[ 10, { fruit: 'pasta' }, [ 'apple', 'pineapple' ], 0 ],
			[ 10, { fruit: 'tomato' }, [ 'apple', 'pineapple' ], 0 ],
			// Updates of last item (20 = pineapple)
			[ 20, { fruit: 'abiu' }, [ 'abiu', 'apple' ], 2 ],
			[ 20, { fruit: 'kiwi' }, [ 'apple', 'kiwi' ], 0 ],
			[ 20, { fruit: 'tomato' }, [ 'apple', 'tomato' ], 0 ],
			// Changing filter
			[ 10, { hidden: false }, [ 'apple', 'banana', 'pineapple' ], 1 ],
			[ 20, { hidden: true }, [ 'apple' ], 1 ],
			[ 30, { hidden: false }, [ 'apple', 'orange', 'pineapple' ], 1 ],
			[ 40, { hidden: true }, [ 'pineapple' ], 1 ],
		])("given model %s change event=%o, results in mapped fruits equals %p in %d events", (modelId, event, expected, expectedEvents) => {
			collection = new ModelToCollection(nestedModel, {
				compare: (a, b) => a.value.fruit.localeCompare(b.value.fruit),
				filter: (k, v) => !v.hidden
			});
			collection.on('add', eventRecorder('add'));
			collection.on('remove', eventRecorder('remove'));

			let arr = collection.toArray();

			if (modelId !== null) {
				models[modelId].set(event);
			}

			jest.runAllTimers();
			try {
				expect(collection.toArray().map(m => m.fruit)).toEqual(expected);
				expect(collection.length).toEqual(expected.length);
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
				expect(recordedEvents.length).toEqual(expectedEvents);
			} catch (err) {
				err.message = `${err.message}\n\nevents:\n\t${JSON.stringify(recordedEvents.map(e => ({ event: e.event, idx: e.idx, fruit: e.item.fruit })), null, 2)}`;
				throw err;
			}
		});
	});

	describe("iterator", () => {
		it("iterates over each item in collection", () => {
			collection = new ModelToCollection(model);
			let arr = collection.toArray();
			for (let item of collection) {
				let expected = arr.shift();
				expect(item).toBe(expected);
			}
			expect(arr.length).toBe(0);
		});
	});
});
