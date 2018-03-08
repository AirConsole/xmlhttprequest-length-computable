# XMLHttpRequest-Length-Computable
A javascript shim that always has an estimated computable length for XMLHTTPRequests in onProgress functions.

## Why do you need this library?
Google Chrome (as of version 64) can not estimate the total download size of XMLHTTPRequests when `content-encoding: gzip` is set, even if the `content-length` header is set. This means that if you want to have a nice UI that listens to onProgress events of an XMLHTTPRequest, the UI doesn't update until the complete file is downloaded.

A good example of why this library is needed are Unity WebGL games. They download big data files and show a nice progress bar. This progress bar looks stuck in Google Chrome.

## How to use this library
Just download xmlhttprequest-length-computable.min.js and include it in your html page.

```html
<script type="text/javascript" src="xmlhttprequest-length-computable.min.js"></script>
```
Now you will always see some estimated progress. If there is absolutely no information about the file size, the file is assumed to be 1MB.

Here is an example call that you could do:

```javascript
var request = new XMLHttpRequest();
request.onprogress = function(event) {
  console.log(event.loaded / event.total * 100) + "%";
}
request.open('GET', "test-data.txt", true);
req.send();
```

# Further Configuration

## How does the library work?

- If a browser can compute the download size (`XMLHTTPRequest.lengthComputable == true`) nothing is modified.
- If a browser can not compute the download size we estimate it in the following prioritised order:
  - If you pass `decompressed-content-length` in the `XMLHTTPRequest` constructors `xmlHTTPRequestLengthComputable` config, then this value is used.
  - If the `x-decompressed-content-length` http response header is set, we estimate the total size based on this value. This is a custom header that you will have to add in your webserver. The value should be the number of bytes after all decompression has happened to a file.
  - If the `content-length` response header is set, then we use this value to estimate the size. If files are compressed then we multiply the `content-length` by 1.5x
  - If the `content-length` response header  is not set, then we estimate the total size to be 1MB.

## How to to pass the real length of a file to the library

You can pass a configuration argument to the XMLHTTPRequest Constructor. This argument needs to have a property `xmlHTTPRequestLengthComputable` with a `decompressed-content-length` property corresponding to the size in bytes of the file.

### Example how the specify the content size explicitly

```javascript
new XMLHTTPRequest({
  "xmlHTTPRequestLengthComputable": {
    "decompressed-content-length": 1024
  }
})
```

## How to change the calculation of the estimation

**It is good practice to overestimate the file size!**
If you underestimate the file size, then the progress will be stuck at that file size.

You can change the calculation of the estimation in two ways, either globally or only for a single request.

The config properties are as follows:

- `DECOMPRESSED_CONTENT_LENGTH_HEADER`: The name of the header to look at to get the decompressed file size. Default: `x-decompressed-content-length`
- `CONTENT_ENCODING_MULTIPLE`: The factor to use when estimating content-encoded transders (like gzip). Default: `1.5`
- `DEFAULT_CONTENT_LENGTH`: The default content length to use when `content-length` is not set. Default: `1048576` (1MB)


### Changing the estimation for a single request

You can pass a configuration argument to the XMLHTTPRequest Constructor. This argument needs to have a property `xmlHTTPRequestLengthComputable` containing the config.

```javascript
new XMLHTTPRequest({
  "xmlHTTPRequestLengthComputable": {
    DECOMPRESSED_CONTENT_LENGTH_HEADER: "x-decompressed-content-length",
    CONTENT_ENCODING_MULTIPLE: 1.5,
    DEFAULT_CONTENT_LENGTH: 1048576
  }
});
```

### Changing the estimation globally

You can set the default config in `window.xmlHTTPRequestLengthComputable`:

```javascript
window.xmlHTTPRequestLengthComputable = {
  DECOMPRESSED_CONTENT_LENGTH_HEADER: "x-decompressed-content-length",
  CONTENT_ENCODING_MULTIPLE: 1.5,
  DEFAULT_CONTENT_LENGTH: 1048576
}

new XMLHTTPRequest();
```

## My progress still looks stuck!

Most likely you didn't read the documentation properly (see **How does the library work?**).

If that part sounds too complicated, then just change the global configuration to your biggest file size that you are requesting.

```html
<script type="text/javascript" src="xmlhttprequest-length-computable.min.js"></script>
<script type="text/javascript">
  window.xmlHTTPRequestLengthComputable = {
    DEFAULT_CONTENT_LENGTH: 1048576
  }
</script>
```
In this case the biggest file size is `1048576` (1MB). Feel free to change this value to something bigger. The progress will jump quickly on smaller files, but nothing looks stuck.

