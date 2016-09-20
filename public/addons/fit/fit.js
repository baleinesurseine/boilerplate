/*
 *  Fit terminal columns and rows to the dimensions of its
 *  DOM element.
 *
 *  Approach:
 *    - Rows: Truncate the division of the terminal parent element height
 *            by the terminal row height
 *
 *    - Columns: Truncate the division of the terminal parent element width by
 *               the terminal character width (apply display: inline at the
 *               terminal row and truncate its width with the current number
 *               of columns)
 */
(function (fit) {
  if (typeof exports === 'object' && typeof module === 'object') {
    /*
     * CommonJS environment
     */
    module.exports = fit(require('../../src/xterm'))
  } else if (typeof define === 'function') {
    /*
     * Require.js is available
     */
    define(['../../src/xterm'], fit)
  } else {
    /*
     * Plain browser environment
     */
    fit(window.Terminal)
  }
})(function (Xterm) {
  /**
   * This module provides methods for fitting a terminal's size to a parent container.
   *
   * @module xterm/addons/fit/fit
   */
  var exports = {}

  exports.proposeGeometry = function (term) {
    var parentElementStyle = window.getComputedStyle(term.element.parentElement)
    var parentElementHeight = parseInt(parentElementStyle.getPropertyValue('height'))
    var parentElementWidth = parseInt(parentElementStyle.getPropertyValue('width'))
    var elementStyle = window.getComputedStyle(term.element)
    var elementPaddingVer = parseInt(elementStyle.getPropertyValue('padding-top')) + parseInt(elementStyle.getPropertyValue('padding-bottom'))
    var elementPaddingHor = parseInt(elementStyle.getPropertyValue('padding-right')) + parseInt(elementStyle.getPropertyValue('padding-left'))
    var availableHeight = parentElementHeight - elementPaddingVer
    var availableWidth = parentElementWidth - elementPaddingHor
    var container = term.rowContainer
    var subjectRow = term.rowContainer.firstElementChild
    var contentBuffer = subjectRow.innerHTML
    var characterHeight
    var rows
    var characterWidth
    var cols
    var geometry

    subjectRow.style.display = 'inline'
    subjectRow.innerHTML = 'W' // Common character for measuring width, although on monospace
    characterWidth = subjectRow.getBoundingClientRect().width
    subjectRow.style.display = '' // Revert style before calculating height, since they differ.
    characterHeight = parseInt(subjectRow.offsetHeight)
    subjectRow.innerHTML = contentBuffer

    rows = parseInt(availableHeight / characterHeight)
    cols = parseInt(availableWidth / characterWidth) - 1

    geometry = {cols: cols, rows: rows}
    return geometry
  }

  exports.fit = function (term) {
    var geometry = exports.proposeGeometry(term)

    term.resize(geometry.cols, geometry.rows)
  }

  Xterm.prototype.proposeGeometry = function () {
    return exports.proposeGeometry(this)
  }

  Xterm.prototype.fit = function () {
    return exports.fit(this)
  }

  return exports
})
