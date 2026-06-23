// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Radix UI components produce document-level side effects when dialogs/menus are open.
// In React 19 concurrent mode, the useEffect cleanups that reverse these side effects
// may be deferred past the test boundary, contaminating subsequent tests.
//
// @radix-ui/react-dismissable-layer sets body.style.pointerEvents = "none" as an
// inline style when a Dialog (modal=true) is open, so pointer interactions on the
// next test's elements fail with "pointer-events: none".
//
// react-remove-scroll (inert mode) adds block-interactivity-* CSS classes to body.
//
// Force-reset all of these after every test so the document is clean before the
// next render.
afterEach(() => {
  document.body.style.pointerEvents = ''
  Array.from(document.body.classList)
    .filter((c) => c.startsWith('block-interactivity-'))
    .forEach((c) => document.body.classList.remove(c))
})

// jsdom does not implement Blob/File.arrayBuffer() — polyfill it so that hooks
// that call file.arrayBuffer() (e.g. useUploadBillAttachment) work in tests.
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}

// jsdom does not implement Blob/File.text() — polyfill it so that import
// handlers that call file.text() work in tests.
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function () {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(this)
    })
  }
}
