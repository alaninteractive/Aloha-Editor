/*!
 * Aloha Editor
 * Author & Copyright (c) 2010 Gentics Software GmbH
 * aloha-sales@gentics.com
 * Licensed unter the terms of http://www.aloha-editor.com/license.html
 */

/**
 * @name block.block
 * @namespace Block models
 */
define(['block/blockmanager', 'core/observable', 'core/floatingmenu'],
function(BlockManager, Observable, FloatingMenu) {
	"use strict";

	var
		jQuery = window.alohaQuery || window.jQuery, $ = jQuery,
		Aloha = window.Aloha;

	/**
	 * @name block.block.AbstractBlock
	 * @class An abstract block that must be used as a base class for custom blocks
	 */
	var AbstractBlock = Class.extend(Observable,
	/** @lends block.block.AbstractBlock */
	{

		/**
		 * @name block.block.AbstractBlock#change
		 * @event
		 */

		/**
		 * Title for the block, used to display the name in the sidebar.
		 * @type String
		 * @api
		 */
		title: null,

		/**
		 * Id of the assigned element, used to identify a block
		 * @type String
		 */
		id: null,

		/**
		 * The original block element
		 * @type jQuery
		 */
		// TODO: Rename to $element
		element: null,

		/**
		 * Either "inline" or "block", will be guessed from the original block dom element
		 * @type String
		 */
		_domElementType: null,

		/**
		 * @param {jQuery} element Element that declares the block
		 * @constructor
		 */
		_constructor: function(element) {
			var that = this;
			this.id = element.attr('id');
			this.element = element;


			this._domElementType = GENTICS.Utils.Dom.isBlockLevelElement(element[0]) ? 'block' : 'inline';

			this.element.addClass('aloha-block');
			this.element.addClass('aloha-block-' + this.attr('block-type'));

			// Register event handlers for activating an Aloha Block
			this.element.bind('click', function(event) {
				that.activate();
				return false;
			});
			
			Aloha.bind('aloha-block-selected', function(event,obj) {
				if (that.element.get(0) === obj) {
					that.activate();
				}
			});

			// The "contentEditableSelectionChange" event listens on
			// mouseDown and focus, and we need to suppress these events
			// such that the editable does not update its selection.
			this.element.bind('mousedown', function() {
				// TODO: if you right-click on a block, this does not show
				// the context menu. So, we somehow need to handle this differently
				return false;
			}).bind('focus', function() {
				return false;
			}).bind('dblclick', function() {
				return false;
			});
			this.init();
		},

		/**
		 * Template method to initialize the block
		 * @api
		 */
		init: function() {},

		/**
		 * Get a schema of attributes with
		 *
		 * TODO Document schema format
		 *
		 * @api
		 * @returns {Object}
		 */
		getSchema: function() {
			return null;
		},

		/**
		 * Template Method which should return the block title
		 */
		getTitle: function() {
			return this.title;
		},

		/**
		 * activates the block
		 * will select the block's contents, highlight it, an update the floating menu
		 *
		 * @return always boolean false
		 */
		activate: function() {
			var previouslyActiveBlocks = BlockManager.getActiveBlocks(),
				activeBlocks = [];

			delete previouslyActiveBlocks[this.id];

			this._selectBlock();

			// Set scope to current block
			FloatingMenu.setScope('Aloha.Block.' + this.attr('block-type'));

			this._highlight();
			activeBlocks.push(this);

			this.element.parents('.aloha-block').each(function() {
				var block = BlockManager.getBlock(this);
				delete previouslyActiveBlocks[block.id];

				block._highlight();
				activeBlocks.push(block);
			});
			$.each(previouslyActiveBlocks, function() {
				this.deactivate();
			});

			BlockManager.trigger('block-selection-change', activeBlocks);

			return false;
		},

		/**
		 * Activated when the block is clicked
		 */
		_highlight: function() {
			this.element.addClass('aloha-block-active');
		},


		_unhighlight: function() {
			this.element.removeClass('aloha-block-active');
		},

		_selectBlock: function(event) {
			/*if (!event || $(event.target).is('.aloha-editable') || $(event.target).parents('.aloha-block, .aloha-editable').first().is('.aloha-editable')) {
				// It was clicked on a Aloha-Editable inside a block; so we do not
				// want to select the whole block and do an early return.
				return;
			}*/

			GENTICS.Utils.Dom.selectDomNode(this.element[0]);
		},

		/**
		 * Deactive the block
		 */
		deactivate: function() {
			this._unhighlight();
			this.element.parents('.aloha-block').each(function() {
				this._unhighlight();
			});
			BlockManager.trigger('block-selection-change', []);
			this.element.removeClass('aloha-block-active');
			// TODO: remove the current selection here
		},

		/**
		 * @returns {Boolean} True if this block is active
		 */
		isActive: function() {
			return this.element.hasClass('aloha-block-active');
		},

		/**
		 * Get the id of the block
		 * @returns {String}
		 */
		getId: function() {
			return this.id;
		},

		/**
		 * Template method to render contents of the block, must be implemented by specific block type
		 * @api
		 */
		render: function() {},

		_renderAndSetContent: function() {
			var innerElement = $('<' + this._getWrapperElementType() + ' class="aloha-block-inner" />');
			var result = this.render(innerElement);
			// Convenience for simple string content
			if (typeof result === 'string') {
				innerElement.html(result);
			}
			this.element.empty();
			this.element.append(innerElement);

			this.createEditables(innerElement);

			this.renderToolbar();
		},

		_getWrapperElementType: function() {
			return this._domElementType === 'block' ? 'div' : 'span';
		},

		/**
		 * Create editables from the inner content that was
		 * rendered for this block.
		 *
		 * Override to use a custom implementation and to pass
		 * special configuration to .aloha()
		 *
		 * @param {jQuery} innerElement
		 */
		createEditables: function(innerElement) {
			innerElement.find('.aloha-editable').aloha();
		},

		/**
		 * Render block toolbar elements
		 *
		 * Template method to render custom block UI.
		 */
		renderToolbar: function() {
			this.element.prepend('<span class="aloha-block-draghandle"></span>');
		},

		/**
		 * Get or set one or many attributes
		 *
		 * @api
		 * @param {String|Object} attributeNameOrObject
		 * @param {String} attributeValue
		 */
		attr: function(attributeNameOrObject, attributeValue) {
			var that = this, attributeChanged = false;

			if (arguments.length === 2) {
				if (this._getAttribute(attributeNameOrObject) !== attributeValue) {
					attributeChanged = true;
				}
				this._setAttribute(attributeNameOrObject, attributeValue);
			} else if (typeof attributeNameOrObject === 'object') {
				$.each(attributeNameOrObject, function(key, value) {
					if (that._getAttribute(key) !== value) {
						attributeChanged = true;
					}
					that._setAttribute(key, value);
				});
			} else if (typeof attributeNameOrObject === 'string') {
				return this._getAttribute(attributeNameOrObject);
			} else {
				return this._getAttributes();
			}
			if (attributeChanged) {
				this._renderAndSetContent();
				this.trigger('change');
			}
			return this;
		},

		_setAttribute: function(name, value) {
			if (name === 'about') {
				this.element.attr('about', value);
			} else {
				this.element.attr('data-' + name, value);
			}
		},

		_getAttribute: function(name) {
			return this._getAttributes()[name];
		},

		_getAttributes: function() {
			var attributes = {};

			// element.data() not always up-to-date, that's why we iterate over the attributes directly.
			$.each(this.element[0].attributes, function(i, attribute) {
				if (attribute.name === 'about') {
					attributes['about'] = attribute.value;
				} else if (attribute.name.substr(0, 5) === 'data-') {
					attributes[attribute.name.substr(5)] = attribute.value;
				}
			});

			return attributes;
		}
	});

	/**
	 * @name block.block.DefaultBlock
	 * @class A default block that renders the initial content
	 * @extends block.block.AbstractBlock
	 */
	var DefaultBlock = AbstractBlock.extend(
	/** @lends block.block.DefaultBlock */
	{
		init: function() {
			this.attr('default-content', this.element.html());
		},
		render: function() {
			return this.attr('default-content');
		}
	});

	/**
	 * @name block.block.DebugBlock
	 * @class A debug block outputs its attributes in a table
	 * @extends block.block.AbstractBlock
	 */
	var DebugBlock = AbstractBlock.extend(
	/** @lends block.block.DebugBlock */
	{
		title: 'Debugging',
		render: function() {
			this.element.css({display: 'block'});
			var renderedAttributes = '<table class="debug-block">';
			$.each(this.attr(), function(k, v) {
				renderedAttributes += '<tr><th>' + k + '</th><td>' + v + '</td></tr>';
			});

			renderedAttributes += '</table>';

			return renderedAttributes;
		}
	});

	return {
		AbstractBlock: AbstractBlock,
		DefaultBlock: DefaultBlock,
		DebugBlock: DebugBlock
	};
});
