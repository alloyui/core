'use strict';

import { async } from 'metal';
import dom from './dom';

/**
 * Utility functions for running styles.
 */
class globalEvalStyles {
	/**
	 * Evaluates the given style.
	 * @param {string} text
	 * @return {Element} style
	 */
	static run(text) {
		var style = document.createElement('style');
		style.innerHTML = text;
		document.head.appendChild(style);
		return style;
	}

	/**
	 * Evaluates the given style file.
	 * @param {string} href The file's path.
	 * @param {function()=} opt_callback Optional function to be called
	 *   when the styles has been run.
	 * @return {Element} style
	 */
	static runFile(href, opt_callback) {
		var link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;
		globalEvalStyles.runStyle(link, opt_callback);
		return link;
	}

	/**
	 * Evaluates the code referenced by the given style/link element.
	 * @param {!Element} style
	 * @param {function()=} opt_callback Optional function to be called
	 *   when the script has been run.
	 *  @return {Element} style
	 */
	static runStyle(style, opt_callback) {
		var callback = function() {
			opt_callback && opt_callback();
		};
		if (style.rel && style.rel !== 'stylesheet') {
			async.nextTick(callback);
			return;
		}

		if (style.tagName === 'STYLE') {
			async.nextTick(callback);
		} else {
			dom.on(style, 'load', callback);
			dom.on(style, 'error', callback);
		}
		document.head.appendChild(style);
		return style;
	}

	/**
	 * Evaluates any style present in the given element.
	 * TODO: Evaluates running styles in parallel instead of in order.
	 * @params {!Element} element
	 * @param {function()=} opt_callback Optional function to be called
	 *   when the style has been run.
	 */
	static runStylesInElement(element, opt_callback) {
		var styles = element.querySelectorAll('style,link');
		if (styles.length === 0 && opt_callback) {
			async.nextTick(opt_callback);
			return;
		}

		var loadCount = 0;
		var callback = function() {
			if (opt_callback && ++loadCount === styles.length) {
				async.nextTick(opt_callback);
			}
		};
		for (var i = 0; i < styles.length; i++) {
			globalEvalStyles.runStyle(styles[i], callback);
		}
	}
}

export default globalEvalStyles;
