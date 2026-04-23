// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

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
