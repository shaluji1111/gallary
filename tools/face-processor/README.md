# Face Processor Tool

This tool downloads images from your Cloudinary storage, detects faces, groups similar faces together, and generates thumbnails for the "Find by Face" feature.

## Prerequisites

You need Python installed on your computer.

Install the required libraries:

```bash
pip install face_recognition requests numpy Pillow scikit-learn
```

*Note: On Windows, you might need to install CMake and Visual Studio C++ build tools to install `face_recognition`.*

## How to use

1. Open your terminal/command prompt.
2. Navigate to this directory:
   ```bash
   cd tools/face-processor
   ```
3. Run the script:
   ```bash
   python process_faces.py
   ```

## What it does

- **Downloads**: It will create a `downloaded_images` folder and download all images from your gallery manifest.
- **Analyzes**: It uses AI to find faces and group images of the same person.
- **Thumbnails**: It creates a `face-thumbnails` folder in `public/` with cropped photos of each person.
- **JSON**: It generates `public/faces.json` which the website uses to filter the gallery.
