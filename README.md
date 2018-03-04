[![view on npm](http://img.shields.io/npm/v/modapp-l10n.svg)](https://www.npmjs.org/package/modapp-resource)

# ModApp Resource
Utility classes implementing modapp's resource interfaces for Models and Collections.

## Installation

With npm:
```sh
npm install modapp-resource
```

With yarn:
```sh
yarn add modapp-resource
```

## Usage

```javascript
import Model from 'modapp-resource/Model';

// Creating generic model
let model = new Model({
	data: {
		id: 12,
		foo: "bar"
	}
});

let onChange = changed => alert("Foo is now ", model.foo);

// Adding a model listener
model.on('change', onChange);

// Setting the property foo, triggering a change event
model.set({foo: "baz"});

// Removing model listener
model.off('change', onChange);

```