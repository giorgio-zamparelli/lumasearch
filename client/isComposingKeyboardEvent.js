/* Copyright 2013 - 2026 Waiterio LLC */

/**
 * Let an IME own its confirmation and candidate-navigation keys.
 * React 19 keeps isComposing on nativeEvent, not SyntheticKeyboardEvent.
 * Legacy Safari can deliver compositionend before the confirming keydown,
 * leaving isComposing false but keyCode 229 (WebKit bugs 165004 / 324380).
 *
 * Return before preventing the default or selecting/submitting anything.
 * No timing window: the next ordinary Enter must work immediately.
 *
 * @param {{ isComposing?: boolean, keyCode?: number, nativeEvent?: { isComposing?: boolean, keyCode?: number } }} event
 * @returns {boolean}
 */
export default function isComposingKeyboardEvent(event) {
  const keyboardEvent = event.nativeEvent ?? event
  return keyboardEvent.isComposing === true || keyboardEvent.keyCode === 229
}
