# Chunk Loader
Chunk Loader is a Chrome/firefox extension that allows users to load and import JavaScript chunks from a specified URL. This tool is designed for security researchers/bugbounty hunters to help them find bugs in react apps.

## Features
- Auto-find the useful js file to load chunks from.
- Load JavaScript chunks from a specified URL.
- Specify the base path for chunk files.
- Customize the file extension for chunk files.
- Persist URL, base path, and file extension across browser sessions.
- Parse _buildManifest.js files to find the chunks automatically.
- Parse webpacks (most of the time)

## Installation Instructions
Follow these steps to install and use the Chunk Loader extension in Google Chrome/FF dev build.

- Firefox store: **Todo**

- Chrome store: The app can't be published on chrome store as it uses manifest v2 with features that manifest v3 will block with the CSPs... (I tried, but if you can get it to work on manifest v3, I'm open to contribs :D)

### Step 1: Clone the Repository
First, clone the repository to your local machine using the following command:

```bash
git clone https://github.com/ElSicarius/chunkloader.git

```

### Step 2: Load the Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" by toggling the switch in the upper-right corner.
3. Click the "Load unpacked" button.
4. Select the "chunkloader" subdirectory from where you cloned the repository (chunkloader).

### Step 3: Use the Extension
1. Click on the Chunk Loader extension icon in the Chrome toolbar to open the popup.
2. Enter the URL of the main JavaScript file in the "JS File URL" field, or just click the `auto-find` and try the suggested resources ! (You can cycle the sources by hitting the button multiple times)
3. The base path for chunk files will be automatically populated based on the JS file URL. You can modify it if needed.
4. Enter the file extension for the chunk files in the "File Extension" field (default is .chunk.js, but it might try to adapt to the techno you're on).
5. Click the "Load Chunks" button to load the specified chunks and see the magic happen.


## Contributing
Contributions are welcome! If you have any suggestions or improvements, please open an issue or submit a pull request.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contact
For any questions or inquiries, you can reach out to [me](https://twitter.com/ElS1carius) on Twitter.
