'use strict';

import array from '../array/array';
import core from '../core';
import dom from '../dom/dom';
import html from '../html/html';
import object from '../object/object';
import Component from '../component/Component';
import ComponentCollector from '../component/ComponentCollector';
import ComponentRegistry from '../component/ComponentRegistry';
import EventsCollector from '../component/EventsCollector';

import './SoyComponent.soy';

/**
 * We need to listen to calls to the SoyComponent template so we can use them to
 * properly instantiate and update child components defined through soy.
 * TODO: Switch to using proper AOP.
 */
var originalTemplate = ComponentRegistry.Templates.SoyComponent.component;

/**
 * Special Component class that handles a better integration between soy templates
 * and the components. It allows for automatic rendering of surfaces that have soy
 * templates defined with their names, skipping the call to `getSurfaceContent`.
 * @param {Object} opt_config An object with the initial values for this component's
 *   attributes.
 * @constructor
 * @extends {Component}
 */
class SoyComponent extends Component {
  constructor(opt_config) {
    core.mergeSuperClassesProperty(this.constructor, 'TEMPLATES', this.mergeTemplates_);
    super(opt_config);

    /**
     * Holds a `ComponentCollector` that will extract inner components.
     * @type {!ComponentCollector}
     * @protected
     */
    this.componentCollector_ = new ComponentCollector(this.element);

    /**
     * Gets all nested components.
     * @type {!Array<!Component>}
     */
    this.components = null;

    /**
     * Holds events that were listened through the element.
     * @type {!EventHandler}
     * @protected
     */
    this.eventsCollector_ = new EventsCollector(this);

    /**
     * Stores the arguments that were passed to the last call to the
     * SoyComponent template for each component instance (mapped by its id).
     * @type {!Object}
     * @protected
     */
    this.componentsInterceptedData_ = {};

    this.addSurfacesFromTemplates_();
  }

  /**
   * Adds surfaces for each registered template that is not named `element`.
   * @protected
   */
  addSurfacesFromTemplates_() {
    var templates = this.constructor.TEMPLATES_MERGED;
    for (var templateName in templates) {
      if (templateName !== 'content' &&
        templateName !== 'contentElement' &&
        templateName.substr(0, 13) !== '__deltemplate') {

        var surface = this.getSurface(templateName);
        if (!surface) {
          this.addSurface(templateName, {
            renderAttrs: templates[templateName].params
          });
        }
      }
    }
  }

  /**
   * @inheritDoc
   * @override
   */
  attach(opt_parentElement, opt_siblingElement) {
    if (this.decorating_) {
      // We need to call the element soy template function when the component
      // is being decorated, even though we won't use its results. This call is
      // only needed in order for us tointercept the call data for nested components.
      this.renderElementTemplate();
      this.componentCollector_.setShouldDecorate(true);
    }

    this.componentCollector_.extractComponents(this.componentsInterceptedData_);
    this.componentCollector_.setShouldDecorate(false);

    super.attach(opt_parentElement, opt_siblingElement);
    this.componentsInterceptedData_ = {};
    this.attachInlineListeners_();

    return this;
  }

  /**
   * Attaches inline listeners to the main element.
   * @protected
   */
  attachInlineListeners_() {
    this.eventsCollector_.attachListeners(this.element.parentNode.innerHTML);
  }

  /**
   * Overrides the method that compresses html for caching, so that it now
   * first empties all nested component placeholders before compressing.
   * @param {string} htmlString The html to be compressed.
   * @return {string} The compressed html.
   * @protected
   * @override
   */
  compressHtmlForCache_(htmlString) {
    htmlString = html.removeElementContent(htmlString, ' data-component');
    htmlString = html.removeElementContent(htmlString, ' data-component-children');
    return super.compressHtmlForCache_(htmlString);
  }

  /**
   * Calls decorate on all children components, setting their element
   * attribute to the appropriate element inside the children placeholder.
   * @param {!Element} placeholder Placeholder where the children should be
   *   rendered.
   * @param {!Array<!Component>} children An array of children components.
   * @return {boolean}
   */
  decorateChildren_(placeholder, children) {
    children.forEach(function(child) {
      child.decorate();
    });
  }

  /**
   * @inheritDoc
   * @override
   */
  detach() {
    this.eventsCollector_.detachAllListeners();
    super.detach();
    return this;
  }

  /**
   * Gets all nested components.
   * @return {!Array<!Component>}
   * @protected
   */
  getComponents_() {
    return this.componentCollector_.getComponents();
  }

  /**
   * Overrides the default behavior so that this can automatically render
   * the appropriate soy template when one exists.
   * @param {string} surfaceId The surface id.
   * @return {Object|string} The content to be rendered.
   * @protected
   * @override
   */
  getSurfaceContent_(surfaceId) {
    var surfaceTemplate = this.constructor.TEMPLATES_MERGED[surfaceId];
    if (core.isFunction(surfaceTemplate)) {
      return this.renderTemplate_(surfaceTemplate);
    } else {
      return super.getSurfaceContent_(surfaceId);
    }
  }

  /**
   * Handles a call to the SoyComponent template.
   * @param {!Object} data The data the template was called with.
   * @return {string} The original return value of the template.
   */
  handleTemplateCall_(data) {
    var callData = {
      componentName: data.componentName
    };
    callData.data = this.normalizeTemplateCallData_(data);
    this.componentsInterceptedData_[data.id] = callData;
    return originalTemplate.apply(originalTemplate, arguments);
  }

  /**
   * Merges an array of values for the `TEMPLATES` property into a single object.
   * @param {!Array} values The values to be merged.
   * @return {!Object} The merged value.
   * @protected
   */
  mergeTemplates_(values) {
    return object.mixin.apply(null, [{}].concat(values.reverse()));
  }

  /**
   * Normalizes a template's call data, converting special soy objects
   * into html strings. This function doesn't change the original data
   * object.
   * @param {!Object} data
   * @return {!Object}
   */
  normalizeTemplateCallData_(data) {
    data = object.mixin({}, data, {
      componentName: null
    });
    for (var key in data) {
      if (data[key] instanceof soydata.SanitizedHtml) {
        data[key] = data[key].content;
      }
    }
    return data;
  }

  /**
   * Renders this component's child components, if their placeholder is found.
   * @protected
   * TODO(edu): Re-think this part.
   */
  renderChildrenComponents_() {
    var placeholder = this.element.querySelector('#' + this.makeSurfaceId_('children-placeholder'));
    if (placeholder) {
      var children = this.children;
      if (this.shouldDecorateChildren_(placeholder)) {
        this.decorateChildren_(placeholder, children);
        return;
      }

      dom.removeChildren(placeholder);
      children.forEach(function(child) {
        if (child.wasRendered) {
          dom.append(placeholder, child.element);
        } else {
          child.render(placeholder);
        }
      });
    }
  }

  /**
   * Overrides the behavior of this method to automatically render the element
   * template if it's defined and to automatically attach listeners to all
   * specified events by the user in the template. Also handles any calls to
   * component templates.
   * @override
   */
  renderInternal() {
    var templateContent = this.renderElementTemplate();
    if (templateContent) {
      dom.append(this.element, templateContent);
    }
  }

  /**
   * Overrides the default behavior of `renderSurfaceContent` to also
   * handle calls to component templates done by the surface's template.
   * @param {string} surfaceId The surface id.
   * @param {Object|string} content The content to be rendered.
   * @override
   */
  renderSurfaceContent(surfaceId, content) {
    super.renderSurfaceContent(surfaceId, content);

    if (this.inDocument) {
      if (this.getSurface(surfaceId).cacheMiss) {
        this.componentCollector_.extractComponents(this.componentsInterceptedData_);
      }
    }
  }

  /**
   * @inheritDoc
   */
  renderSurfacesContent_(surfaces) {
    super.renderSurfacesContent_(surfaces);

    if (this.inDocument) {
      this.setComponentsAttrs_();
      this.componentsInterceptedData_ = {};
      this.attachInlineListeners_();
    }
    // TODO(edu): Moves assignment to be a getter Attribute instead.
    this.components = this.getComponents_();
  }

  /**
   * Renders the main element's template.
   * @return {?string} The template's result content, or undefined if the
   *   template doesn't exist.
   */
  renderElementTemplate() {
    var elementTemplate = this.constructor.TEMPLATES_MERGED.content;
    if (core.isFunction(elementTemplate)) {
      return this.renderTemplate_(elementTemplate);
    }
  }

  /**
   * Renders the specified template.
   * @param {!function()} templateFn [description]
   * @return {string} The template's result content.
   */
  renderTemplate_(templateFn) {
    ComponentRegistry.Templates.SoyComponent.component = this.handleTemplateCall_.bind(this);
    var content = templateFn(this, null, {}).content;
    ComponentRegistry.Templates.SoyComponent.component = originalTemplate;
    return content;
  }

  /**
   * Updates all inner components with their last template call data.
   * @protected
   */
  setComponentsAttrs_() {
    var rootComponents = this.componentCollector_.getRootComponents();
    for (var id in rootComponents) {
      var data = this.componentsInterceptedData_[id];
      if (data) {
        this.componentCollector_.extractSubcomponents(data, this.componentsInterceptedData_);
        if (rootComponents[data.data.id]) {
          rootComponents[data.data.id].setAttrs(data.data);
        }
      }
    }
  }

  /**
   * Checks if children components should be decorated. Returns true when this
   * component is being decorated and the placeholder contents match the number
   * of children.
   * @param {!Element} placeholder Placeholder where the children should be
   *   rendered.
   * @return {boolean}
   */
  shouldDecorateChildren_(placeholder) {
    return this.decorating_ && placeholder.childNodes.length > 0;
  }

  /**
   * Syncs the component according to the new value of the `children` attribute.
   */
  syncChildren(newVal, prevVal) {
    if (!array.equal(newVal, prevVal || [])) {
      this.renderChildrenComponents_();
    }
  }

  /**
   * Provides the default value for element attribute.
   * @return {Element} The element.
   * @protected
   */
  valueElementFn_() {
    if (!this.constructor.TEMPLATES_MERGED.contentElement) {
      return super.valueElementFn_();
    }

    var frag = dom.buildFragment(
      this.renderTemplate_(this.constructor.TEMPLATES_MERGED.contentElement)
    );
    var element = frag.childNodes[0];

    // Remove element from fragment, so it won't have a parent. Otherwise,
    // the `attach` method will think that the element has already been
    // attached.
    frag.removeChild(element);

    return element;
  }
}

/**
 * The soy templates for this component. Templates that have the same
 * name of a registered surface will be used for automatically rendering
 * it.
 * @type {Object<string, !function(Object):Object>}
 * @protected
 * @static
 */
SoyComponent.TEMPLATES = {};

export default SoyComponent;
