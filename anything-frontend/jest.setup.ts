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
