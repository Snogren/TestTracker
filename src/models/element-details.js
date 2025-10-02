/**
 * ElementDetails Model
 * Information about the DOM element that was interacted with
 * Based on data-model.md ElementDetails entity
 */

import '../models/types.js';

/**
 * @class ElementDetails
 */
export class ElementDetails {
  /**
   * @param {string} html - Outer HTML of the element
   * @param {string} selector - CSS selector to locate element
   * @param {string} tagName - HTML tag name (e.g., 'INPUT', 'BUTTON')
   * @param {string|null} id - Element ID attribute
   * @param {string[]} classes - Array of CSS classes
   * @param {string} textContent - Visible text content of element
   * @param {ElementAttributes} attributes - Key-value pairs of important attributes
   * @param {DOMContext} domContext - Surrounding DOM structure
   */
  constructor(html, selector, tagName, id, classes, textContent, attributes, domContext) {
    this.html = html;
    this.selector = selector;
    this.tagName = tagName;
    this.id = id;
    this.classes = classes;
    this.textContent = textContent;
    this.attributes = attributes;
    this.domContext = domContext;
    
    this._validate();
  }

  /**
   * Validate element details data
   * @private
   * @throws {Error} if validation fails
   */
  _validate() {
    if (!this.html || typeof this.html !== 'string') {
      throw new Error('html must be a non-empty string');
    }
    
    if (!this.selector || typeof this.selector !== 'string') {
      throw new Error('selector must be a non-empty string (valid CSS selector)');
    }
    
    if (!this.tagName || typeof this.tagName !== 'string') {
      throw new Error('tagName must be a non-empty string (uppercase)');
    }
    
    if (!Array.isArray(this.classes)) {
      throw new Error('classes must be a valid array');
    }
    
    if (typeof this.textContent !== 'string') {
      throw new Error('textContent must be a string');
    }
    
    if (!this.attributes || typeof this.attributes !== 'object') {
      throw new Error('attributes must be a valid object');
    }
    
    if (!this.domContext || typeof this.domContext !== 'object') {
      throw new Error('domContext must be a valid DOMContext object');
    }
  }

  /**
   * Convert to plain object for storage
   * @returns {Object}
   */
  toJSON() {
    return {
      html: this.html,
      selector: this.selector,
      tagName: this.tagName,
      id: this.id,
      classes: this.classes,
      textContent: this.textContent,
      attributes: this.attributes,
      domContext: this.domContext
    };
  }

  /**
   * Create ElementDetails from plain object
   * @param {Object} data
   * @returns {ElementDetails}
   */
  static fromJSON(data) {
    return new ElementDetails(
      data.html,
      data.selector,
      data.tagName,
      data.id,
      data.classes,
      data.textContent,
      data.attributes,
      data.domContext
    );
  }

  /**
   * Extract ElementDetails from a DOM element
   * @param {Element} element
   * @param {DOMContext} domContext
   * @param {string} selector - Pre-generated CSS selector
   * @returns {ElementDetails}
   */
  static fromElement(element, domContext, selector) {
    const attributes = {
      type: element.getAttribute('type') || null,
      name: element.getAttribute('name') || null,
      value: element.value || null,
      placeholder: element.getAttribute('placeholder') || null
    };
    
    // Add other relevant attributes
    const relevantAttrs = ['href', 'src', 'alt', 'title', 'aria-label', 'role', 'data-testid'];
    relevantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        attributes[attr] = value;
      }
    });
    
    return new ElementDetails(
      element.outerHTML,
      selector,
      element.tagName.toUpperCase(),
      element.id || null,
      Array.from(element.classList),
      element.textContent.trim(),
      attributes,
      domContext
    );
  }
}

/**
 * @class DOMContext
 * The surrounding DOM structure to provide location context for an element
 */
export class DOMContext {
  /**
   * @param {ParentInfo[]} parents - Array of parent elements (up to 5 levels)
   * @param {SiblingInfo} siblings - Adjacent elements
   * @param {string} xpath - XPath to element (alternative locator)
   */
  constructor(parents, siblings, xpath) {
    this.parents = parents;
    this.siblings = siblings;
    this.xpath = xpath;
    
    this._validate();
  }

  /**
   * Validate DOM context data
   * @private
   * @throws {Error} if validation fails
   */
  _validate() {
    if (!Array.isArray(this.parents)) {
      throw new Error('parents must be an array');
    }
    
    if (this.parents.length > 5) {
      throw new Error('parents limited to maximum 5 elements');
    }
    
    this.parents.forEach((parent, index) => {
      if (!parent.tagName || !parent.selector) {
        throw new Error(`Parent at index ${index} must have valid tagName and selector`);
      }
    });
    
    if (!this.siblings || typeof this.siblings !== 'object') {
      throw new Error('siblings must be a valid object');
    }
    
    if (!this.xpath || typeof this.xpath !== 'string') {
      throw new Error('xpath must be a non-empty string');
    }
  }

  /**
   * Convert to plain object for storage
   * @returns {Object}
   */
  toJSON() {
    return {
      parents: this.parents,
      siblings: this.siblings,
      xpath: this.xpath
    };
  }

  /**
   * Create DOMContext from plain object
   * @param {Object} data
   * @returns {DOMContext}
   */
  static fromJSON(data) {
    return new DOMContext(
      data.parents,
      data.siblings,
      data.xpath
    );
  }
}
