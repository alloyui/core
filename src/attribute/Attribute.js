(function() {
  'use strict';

  /**
   * Attribute utility.
   * @constructor
   */
  lfr.Attribute = function() {
    lfr.Attribute.base(this, 'constructor');

    this.attrsInfo_ = {};
  };
  lfr.inherits(lfr.Attribute, lfr.EventEmitter);

  /**
   * Constants that represent the states that an attribute can be in.
   * @type {Object}
   */
  lfr.Attribute.States = {
    UNINITIALIZED: 0,
    INITIALIZING: 1,
    INITIALIZED: 2
  };

  /**
   * Object that contains information about all this instance's attributes.
   * @type {!Object<string, !Object>}
   * @protected
   */
  lfr.Attribute.prototype.attrsInfo_ = null;

  /**
   * Adds the given attribute.
   * @param {string} name The name of the new attribute.
   * @param {Object.<string, *>=} config The configuration object for the new attribute.
   * @param {*} initialValue The initial value of the new attribute. This value has higher
   *   precedence than the default value specified in this attribute's configuration.
   */
  lfr.Attribute.prototype.addAttr = function(name, config, initialValue) {
    this.attrsInfo_[name] = {
      config: config || {},
      initialValue: initialValue,
      state: lfr.Attribute.States.UNINITIALIZED
    };

    Object.defineProperty(this, name, {
      get: lfr.bind(this.getAttrValue_, this, name),
      set: lfr.bind(this.setAttrValue_, this, name)
    });
  };

  /**
   * Adds the given attributes.
   * @param {!Object.<string, !Object>} configs An object that maps the names of all the
   *   attributes to be added to their configuration objects.
   * @param {!Object.<string, *>} initialValues An object that maps the names of
   *   attributes to their initial values. These values have higher precedence than the
   *   default values specified in the attribute configurations.
   */
  lfr.Attribute.prototype.addAttrs = function(configs, initialValues) {
    initialValues = initialValues || {};
    var names = Object.keys(configs);

    for (var i = 0; i < names.length; i++) {
      this.addAttr(names[i], configs[names[i]], initialValues[names[i]]);
    }
  };

  /**
   * Calls the requested function, running the appropriate code for when it's
   * passed as an actual function object or just the function's name.
   * @param {!Function|string} fn Function, or name of the function to run.
   * @param {...*} A variable number of optional parameters to be passed to the
   *   function that will be called.
   * @return {*} The return value of the called function.
   * @protected
   */
  lfr.Attribute.prototype.callFunction_ = function(fn) {
    var args = Array.prototype.slice.call(arguments, 1);

    if (lfr.isString(fn)) {
      return this[fn].apply(this, args);
    } else if (lfr.isFunction(fn)) {
      return fn.apply(this, args);
    }
  };

  /**
   * Calls the attribute's setter, if there is one.
   * @param {string} name The name of the attribute.
   * @param {*} value The value to be set.
   * @return {*} The final value to be set.
   */
  lfr.Attribute.prototype.callSetter_ = function(name, value) {
    var info = this.attrsInfo_[name];
    var config = info.config;
    if (config.setter) {
      value = this.callFunction_(config.setter, value);
    }
    return value;
  };

  /**
   * Calls the attribute's validator, if there is one.
   * @param {string} name The name of the attribute.
   * @param {*} value The value to be validated.
   * @return {Boolean} Flag indicating if value is valid or not.
   */
  lfr.Attribute.prototype.callValidator_ = function(name, value) {
    var info = this.attrsInfo_[name];
    var config = info.config;
    if (config.validator) {
      return this.callFunction_(config.validator, value);
    }
    return true;
  };

  /**
   * Returns an object that maps all attribute names to their values.
   * @return {Object.<string, *>}
   */
  lfr.Attribute.prototype.getAttrs = function() {
    var attrsMap = {};
    var names = Object.keys(this.attrsInfo_);

    for (var i = 0; i < names.length; i++) {
      attrsMap[names[i]] = this[names[i]];
    }

    return attrsMap;
  };

  /**
   * Gets the value of the specified attribute. This is passed as that attribute's
   * getter to the `Object.defineProperty` call inside the `addAttr` method.
   * @param {string} name The name of the attribute.
   * @return {*}
   * @protected
   */
  lfr.Attribute.prototype.getAttrValue_ = function(name) {
    this.initAttr_(name);

    return this.attrsInfo_[name].value;
  };

  /**
   * Informs of changes to an attributes value through an event. Won't trigger
   * the event if the value hasn't changed or if it's being initialized.
   * @param {string} name The name of the attribute.
   * @param {*} prevVal The previous value of the attribute.
   * @protected
   */
  lfr.Attribute.prototype.informChange_ = function(name, prevVal) {
    var info = this.attrsInfo_[name];
    var value = this[name];

    if (info.state !== lfr.Attribute.States.INITIALIZING && prevVal !== value) {
      this.emit(name + 'Change', {
        attrName: name,
        newVal: value,
        prevVal: prevVal
      });
    }
  };

  /**
   * Initializes the specified attribute, giving it a first value.
   * @param {string} name The name of the attribute.
   * @protected
   */
  lfr.Attribute.prototype.initAttr_ = function(name) {
    var info = this.attrsInfo_[name];
    if (info.state !== lfr.Attribute.States.UNINITIALIZED) {
      return;
    }

    info.state = lfr.Attribute.States.INITIALIZING;
    this.setDefaultValue_(name);
    info.state = lfr.Attribute.States.INITIALIZED;

    this.setInitialValue_(name);
  };

  /**
   * Sets the value of all the specified attributes.
   * @param {!Object.<string,*>} values A map of attribute names to the values they
   *   should be set to.
   */
  lfr.Attribute.prototype.setAttrs = function(values) {
    var names = Object.keys(values);

    for (var i = 0; i < names.length; i++) {
      this[names[i]] = values[names[i]];
    }
  };

  /**
   * Sets the value of the specified attribute. This is passed as that attribute's
   * setter to the `Object.defineProperty` call inside the `addAttr` method.
   * @param {string} name The name of the attribute.
   * @param {*} value The new value of the attribute.
   * @protected
   */
  lfr.Attribute.prototype.setAttrValue_ = function(name, value) {
    if (!this.validateAttrValue_(name, value)) {
      return;
    }

    var info = this.attrsInfo_[name];
    var prevVal = this[name];
    info.value = this.callSetter_(name, value);
    this.informChange_(name, prevVal);
  };

  /**
   * Sets the default value of the requested attribute.
   * @param {string} name The name of the attribute.
   * @return {*}
   */
  lfr.Attribute.prototype.setDefaultValue_ = function(name) {
    var info = this.attrsInfo_[name];
    this[name] = this.callFunction_(info.config.value);
  };

  /**
   * Sets the initial value of the requested attribute.
   * @param {string} name The name of the attribute.
   * @return {*}
   */
  lfr.Attribute.prototype.setInitialValue_ = function(name) {
    var info = this.attrsInfo_[name];
    if (info.initialValue !== undefined) {
      this[name] = info.initialValue;
      info.initialValue = undefined;
    }
  };

  /**
   * Validates the attribute's value, which includes calling the validator defined
   * in the attribute's configuration object, if there is one.
   * @param {string} name The name of the attribute.
   * @param {*} value The value to be validated.
   * @return {Boolean} Flag indicating if value is valid or not.
   */
  lfr.Attribute.prototype.validateAttrValue_ = function(name, value) {
    var info = this.attrsInfo_[name];

    return info.state === lfr.Attribute.States.INITIALIZING ||
      this.callValidator_(name, value);
  };
}());
