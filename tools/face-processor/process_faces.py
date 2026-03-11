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

# Detection Model: 'hog' is faster but less accurate, 'cnn' is very accurate but slow (requires GPU for best performance)
DETECTION_MODEL = 'hog'
UPSAMPLE_TIMES = 1 # Increase to 2 or 3 to find smaller faces
DISTANCE_THRESHOLD = 0.5 # Lower = more strict (fewer faces grouped), Higher = more relaxed

def download_image(url, filepath):
    if os.path.exists(filepath):
        return True
    try:
        # Use a higher resolution for processing if possible, or stick to manifest URLs
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
    image_data = []

    print(f"Processing {len(manifest)} images...")

    for i, item in enumerate(manifest):
        public_id = item['public_id']
        url = item['url']
        filename = public_id.replace('/', '_') + ".jpg"
        filepath = os.path.join(IMAGES_DIR, filename)

        if i % 10 == 0:
            print(f"Progress: {i}/{len(manifest)} images processed...")

        if download_image(url, filepath):
            try:
                image = face_recognition.load_image_file(filepath)
                # Using 'cnn' model if available and specified, but 'hog' is default for compatibility
                face_locations = face_recognition.face_locations(image, number_of_times_to_upsample=UPSAMPLE_TIMES, model=DETECTION_MODEL)
                face_encodings = face_recognition.face_encodings(image, face_locations)

                if len(face_encodings) > 0:
                    print(f"  - Found {len(face_encodings)} face(s) in {public_id}")

                for loc, enc in zip(face_locations, face_encodings):
                    known_encodings.append(enc)
                    image_data.append({
                        "public_id": public_id,
                        "location": loc,
                        "filepath": filepath
                    })
            except Exception as e:
                print(f"  - Error processing {public_id}: {e}")
        else:
            print(f"  - Failed to download {public_id}")

    if not known_encodings:
        print("No faces detected in any images.")
        return

    print(f"Total faces found: {len(known_encodings)}. Clustering into identities...")

    # DBSCAN with tuned epsilon for better separation
    # eps (DISTANCE_THRESHOLD) is the maximum distance between two samples for one to be considered as in the neighborhood of the other.
    clt = DBSCAN(metric="euclidean", eps=DISTANCE_THRESHOLD, min_samples=3, n_jobs=-1)
    clt.fit(known_encodings)

    label_ids = np.unique(clt.labels_)
    num_unique_faces = len(np.where(label_ids > -1)[0])
    print(f"Found {num_unique_faces} unique people (identities).")
    print(f"Faces considered 'noise' (not clustered): {list(clt.labels_).count(-1)}")

    faces_result = []

    for label_id in label_ids:
        if label_id == -1:
            continue

        indexes = np.where(clt.labels_ == label_id)[0]

        # Take the first one as a representative for thumbnail
        rep_idx = indexes[0]
        rep_face = image_data[rep_idx]

        # Create thumbnail
        img = Image.open(rep_face['filepath'])
        top, right, bottom, left = rep_face['location']

        width, height = img.size
        # Add padding around the face
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

        # Collect all unique photos for this person
        photos = sorted(list(set([image_data[idx]['public_id'] for idx in indexes])))

        faces_result.append({
            "id": int(label_id),
            "name": f"Person {label_id + 1}",
            "thumbnail": f"/face-thumbnails/{thumb_filename}",
            "photos": photos,
            "count": len(photos)
        })

    # Sort by number of photos (most frequent first)
    faces_result.sort(key=lambda x: x['count'], reverse=True)

    with open(OUTPUT_FACES_PATH, 'w') as f:
        json.dump(faces_result, f, indent=2)

    print(f"Success! Final data saved to {OUTPUT_FACES_PATH}")
    print(f"Thumbnails generated in {THUMBNAILS_DIR}")

if __name__ == "__main__":
    process()
