'use strict';

var assert = require('assert');
var sinon = require('sinon');
require('../fixture/sandbox.js');

describe('Attribute', function() {
  it('should add an attribute', function() {
    var attr = new lfr.Attribute();
    attr.addAttr('attr1');

    var attrNames = Object.keys(attr.getAttrs());
    assert.strictEqual(1, attrNames.length);
    assert.strictEqual('attr1', attrNames[0]);
  });

  it('should add multiple attributes', function() {
    var attr = new lfr.Attribute();
    attr.addAttrs({
      attr1: {},
      attr2: {}
    });

    var attrNames = Object.keys(attr.getAttrs());
    assert.strictEqual(2, attrNames.length);
    assert.strictEqual('attr1', attrNames[0]);
    assert.strictEqual('attr2', attrNames[1]);
  });

  it('should set and get attribute values', function() {
    var attr = new lfr.Attribute();
    attr.addAttrs({
      attr1: {},
      attr2: {}
    });

    assert.strictEqual(undefined, attr.attr1);
    assert.strictEqual(undefined, attr.attr2);

    attr.attr1 = 1;
    attr.attr2 = 2;

    assert.strictEqual(1, attr.attr1);
    assert.strictEqual(2, attr.attr2);
  });

  it('should set default attribute value', function() {
    var attr = createAttributeInstance();

    assert.strictEqual(1, attr.attr1);
    assert.strictEqual(2, attr.attr2);
  });

  it('should set default attribute value from function name', function() {
    var attr = new lfr.Attribute();
    attr.returns1 = function() {
      return 1;
    };
    attr.addAttrs({
      attr1: {
        value: 'returns1'
      }
    });

    assert.strictEqual(1, attr.attr1);
  });

  it('should ignore invalid value function', function() {
    var attr = new lfr.Attribute();
    attr.addAttrs({
      attr1: {
        valueFn: 1
      }
    });

    assert.strictEqual(undefined, attr.attr1);
  });

  it('should override default attribute value', function() {
    var attr = new lfr.Attribute();
    attr.addAttrs(
      {
        attr1: {
          value: function() {
            return 1;
          }
        },
        attr2: {
          value: function() {
            return 2;
          }
        }
      },
      {
        attr1: 10,
        attr2: 20
      }
    );

    assert.strictEqual(10, attr.attr1);
    assert.strictEqual(20, attr.attr2);
  });

  it('should change initial attribute value', function() {
    var attr = createAttributeInstance();

    attr.attr1 = 10;

    assert.strictEqual(10, attr.attr1);
  });

  it('should initialize attributes lazily', function() {
    var attr = new lfr.Attribute();
    var valueFn = sinon.stub().returns(2);
    attr.addAttrs({
      attr1: {
        value: valueFn
      }
    });

    assert.strictEqual(0, valueFn.callCount);

    assert.strictEqual(2, attr.attr1);
    assert.strictEqual(1, valueFn.callCount);
  });

  it('should validate new attribute values', function() {
    var attr = new lfr.Attribute();
    attr.addAttrs({
      attr1: {
        validator: function(val) {
          return val > 0;
        },
        value: function() {
          return 1;
        }
      }
    });

    attr.attr1 = -1;
    assert.strictEqual(1, attr.attr1);

    attr.attr1 = 2;
    assert.strictEqual(2, attr.attr1);
  });

  it('should validate new attribute values through function name', function() {
    var attr = new lfr.Attribute();
    attr.isPositive = function(val) {
      return val > 0;
    };
    attr.addAttrs({
      attr1: {
        validator: 'isPositive',
        value: function() {
          return 1;
        }
      }
    });

    attr.attr1 = -1;
    assert.strictEqual(1, attr.attr1);

    attr.attr1 = 2;
    assert.strictEqual(2, attr.attr1);
  });

  it('should validate initial attribute values', function() {
    var attr = new lfr.Attribute();
    attr.addAttrs(
      {
        attr1: {
          validator: function(val) {
            return val > 0;
          },
          value: function() {
            return 1;
          }
        }
      },
      {
        attr1: -10
      }
    );

    assert.strictEqual(1, attr.attr1);
  });

  it('should not validate default attribute values', function() {
    var attr = new lfr.Attribute();
    attr.addAttrs({
      attr1: {
        validator: function(val) {
          return val > 0;
        },
        value: function() {
          return -1;
        }
      }
    });

    assert.strictEqual(-1, attr.attr1);
  });

  it('should change attribute new value through setter', function() {
    var attr = new lfr.Attribute();
    attr.addAttrs({
      attr1: {
        setter: Math.abs,
        value: function() {
          return -1;
        }
      }
    });

    assert.strictEqual(1, attr.attr1);

    attr.attr1 = -2;
    assert.strictEqual(2, attr.attr1);

    attr.attr1 = 3;
    assert.strictEqual(3, attr.attr1);
  });

  it('should change attribute new value through setter name', function() {
    var attr = new lfr.Attribute();
    attr.makePositive = Math.abs;
    attr.addAttrs({
      attr1: {
        setter: 'makePositive',
        value: function() {
          return -1;
        }
      }
    });

    assert.strictEqual(1, attr.attr1);

    attr.attr1 = -2;
    assert.strictEqual(2, attr.attr1);

    attr.attr1 = 3;
    assert.strictEqual(3, attr.attr1);
  });

  it('should emit event when attribute changes', function() {
    var attr = createAttributeInstance();

    var listener = sinon.stub();
    attr.on('attr1Change', listener);

    attr.attr1 = 2;
    assert.strictEqual(1, listener.callCount);

    attr.attr1 = 2;
    attr.attr2 = -2;
    attr.attr2 = 1;
    assert.strictEqual(1, listener.callCount);

    attr.attr1 = 3;
    assert.strictEqual(2, listener.callCount);
  });

  it('should provide correct data to the attribute change event', function() {
    var attr = createAttributeInstance();

    var listener = sinon.stub();
    attr.on('attr1Change', listener);

    attr.attr1 = 2;
    var eventData = listener.args[0][0];
    assert.strictEqual('attr1', eventData.attrName);
    assert.strictEqual(1, eventData.prevVal);
    assert.strictEqual(2, eventData.newVal);
  });

  it('should get all attribute values', function() {
    var attr = createAttributeInstance();

    attr.attr1 = 10;

    var attrsMap = attr.getAttrs();
    assert.strictEqual(2, Object.keys(attrsMap).length);
    assert.strictEqual(10, attrsMap.attr1);
    assert.strictEqual(2, attrsMap.attr2);
  });

  it('should set all attribute values', function() {
    var attr = createAttributeInstance();
    attr.setAttrs({
      attr1: 10,
      attr2: 20
    });

    assert.strictEqual(10, attr.attr1);
    assert.strictEqual(20, attr.attr2);
  });
});

function createAttributeInstance() {
  var attr = new lfr.Attribute();
  attr.addAttrs({
    attr1: {
      value: function() {
        return 1;
      }
    },
    attr2: {
      value: function() {
        return 2;
      }
    }
  });

  return attr;
}
