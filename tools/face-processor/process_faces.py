import os
import json
import requests
import numpy as np
from PIL import Image
import face_recognition
from sklearn.cluster import DBSCAN
import io

# Configuration
MANIFEST_PATH = "../../public/manifest.json"
OUTPUT_FACES_PATH = "../../public/faces.json"
THUMBNAILS_DIR = "../../public/face-thumbnails"
IMAGES_DIR = "downloaded_images"

def download_image(url, filepath):
    if os.path.exists(filepath):
        return True
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
    return False

def process():
    if not os.path.exists(THUMBNAILS_DIR):
        os.makedirs(THUMBNAILS_DIR)
    if not os.path.exists(IMAGES_DIR):
        os.makedirs(IMAGES_DIR)

    with open(MANIFEST_PATH, 'r') as f:
        manifest = json.load(f)

    known_encodings = []
    image_data = [] # List of (public_id, face_location)

    print(f"Processing {len(manifest)} images...")

    for item in manifest:
        public_id = item['public_id']
        url = item['url']
        filename = public_id.replace('/', '_') + ".jpg"
        filepath = os.path.join(IMAGES_DIR, filename)

        print(f"Downloading/Loading {filename}...")
        if download_image(url, filepath):
            image = face_recognition.load_image_file(filepath)
            face_locations = face_recognition.face_locations(image)
            face_encodings = face_recognition.face_encodings(image, face_locations)

            for loc, enc in zip(face_locations, face_encodings):
                known_encodings.append(enc)
                image_data.append({
                    "public_id": public_id,
                    "location": loc,
                    "filepath": filepath
                })
        else:
            print(f"Failed to process {public_id}")

    if not known_encodings:
        print("No faces detected.")
        return

    print(f"Found {len(known_encodings)} faces. Clustering...")

    # Clustering
    clt = DBSCAN(metric="euclidean", n_jobs=-1)
    clt.fit(known_encodings)

    label_ids = np.unique(clt.labels_)
    num_unique_faces = len(np.where(label_ids > -1)[0])
    print(f"Found {num_unique_faces} unique faces.")

    faces_result = []

    for label_id in label_ids:
        if label_id == -1: # Noise
            continue

        indexes = np.where(clt.labels_ == label_id)[0]

        # Take the first one as a representative for thumbnail
        rep_idx = indexes[0]
        rep_face = image_data[rep_idx]

        # Create thumbnail
        img = Image.open(rep_face['filepath'])
        top, right, bottom, left = rep_face['location']

        # Add some padding
        width, height = img.size
        pad_h = (bottom - top) // 2
        pad_w = (right - left) // 2

        crop_top = max(0, top - pad_h)
        crop_bottom = min(height, bottom + pad_h)
        crop_left = max(0, left - pad_w)
        crop_right = min(width, right + pad_w)

        face_img = img.crop((crop_left, crop_top, crop_right, crop_bottom))
        face_img.thumbnail((200, 200))

        thumb_filename = f"face_{label_id}.jpg"
        face_img.save(os.path.join(THUMBNAILS_DIR, thumb_filename), "JPEG", quality=90)

        # Collect all photos for this face
        photos = []
        for idx in indexes:
            photos.append(image_data[idx]['public_id'])

        faces_result.append({
            "id": int(label_id),
            "name": f"Person {label_id + 1}",
            "thumbnail": f"/face-thumbnails/{thumb_filename}",
            "photos": list(set(photos))
        })

    with open(OUTPUT_FACES_PATH, 'w') as f:
        json.dump(faces_result, f, indent=2)

    print(f"Done! Results saved to {OUTPUT_FACES_PATH}")

if __name__ == "__main__":
    process()
