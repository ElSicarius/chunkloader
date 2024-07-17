# Chunk Loader
Chunk Loader is a Chrome extension that allows users to load and import JavaScript chunks from a specified URL. This tool is particularly useful for developers who need to dynamically load multiple JavaScript files based on a main script file.

## Features
- Load JavaScript chunks from a specified URL.
- Specify the base path for chunk files.
- Customize the file extension for chunk files.
- Persist URL, base path, and file extension across browser sessions.
## Installation Instructions
Follow these steps to install and use the Chunk Loader extension in Google Chrome.

### Step 1: Clone the Repository
First, clone the repository to your local machine using the following command:

```bash
git clone https://github.com/ElSicarius/chunkloader.git

```

### Step 2: Load the Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" by toggling the switch in the upper-right corner.
3. Click the "Load unpacked" button.
4. Select the directory where you cloned the repository (chunkloader).

### Step 3: Use the Extension
1. Click on the Chunk Loader extension icon in the Chrome toolbar to open the popup.
2. Enter the URL of the main JavaScript file in the "JS File URL" field.
3. The base path for chunk files will be automatically populated based on the JS file URL. You can modify it if needed.
4. Enter the file extension for the chunk files in the "File Extension" field (default is .chunk.js).
5. Click the "Load Chunks" button to load the specified chunks.


## Contributing
Contributions are welcome! If you have any suggestions or improvements, please open an issue or submit a pull request.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contact
For any questions or inquiries, you can reach out to [me](https://twitter.com/ElS1carius) on Twitter.