import json
import uuid

try:
    from google.cloud import storage
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    storage = None

BUCKET_NAME = "trikaalx-flutter"


def save_json_to_gcs(folder: str, user_id: str, data: dict) -> str:
    if not GCS_AVAILABLE:
        raise RuntimeError(
            "Google Cloud Storage module not available. "
            "Install: pip install google-cloud-storage"
        )

    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)

    file_id = uuid.uuid4()
    filename = f"{user_id}_{folder}_{file_id}.json"
    blob_path = f"{folder}/{filename}"

    blob = bucket.blob(blob_path)
    blob.upload_from_string(
        json.dumps(data, default_str=True),
        content_type="application/json",
    )

    return filename
