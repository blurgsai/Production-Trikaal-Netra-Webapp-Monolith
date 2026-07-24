import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from minio import Minio
from minio.error import S3Error

load_dotenv()


class MinioClient:
    def __init__(self, endpoint: str | None = None):
        self.minio_endpoint = endpoint or os.getenv("MINIO_ENDPOINT")
        self.minio_access_key = os.getenv("MINIO_ACCESS_KEY")
        self.minio_secret_key = os.getenv("MINIO_SECRET_KEY")
        self.bucket_name = os.getenv("MINIO_BUCKET_NAME")

        endpoint_host = self.minio_endpoint
        secure = False
        if endpoint_host:
            if endpoint_host.startswith("http://"):
                endpoint_host = endpoint_host[7:]
            elif endpoint_host.startswith("https://"):
                endpoint_host = endpoint_host[8:]
                secure = True

        self.client = Minio(
            endpoint_host,
            access_key=self.minio_access_key,
            secret_key=self.minio_secret_key,
            secure=secure,
        )

    def check_bucket_exists(self) -> bool:
        try:
            return self.client.bucket_exists(self.bucket_name)
        except S3Error:
            return False

    def download_to_temp_file(self, object_name: str) -> Path:
        """
        Downloads an object from MinIO into a temporary file.

        Returns:
            pathlib.Path pointing to the downloaded file.
            Caller is responsible for deleting it.
        """
        suffix = Path(object_name).suffix

        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        )
        temp_file.close()

        self.client.fget_object(
            self.bucket_name,
            object_name,
            temp_file.name,
        )

        return Path(temp_file.name)


    def delete_file(self, bucket_name: str, object_name: str) -> bool:
        """Delete a file from MinIO."""
        try:
            self.client.remove_object(bucket_name, object_name)
            print(f"✓ Deleted '{bucket_name}/{object_name}'")
            return True
        except S3Error as e:
            print(f"Error deleting file: {e}")
            return False

    def create_bucket_if_not_exists(self) -> bool:
        """Create the target bucket if it doesn't already exist."""
        try:
            if not self.check_bucket_exists():
                self.client.make_bucket(self.bucket_name)
                print(f"Bucket '{self.bucket_name}' created successfully.")
                return True
            return True
        except S3Error as e:
            print(f"Error creating bucket: {e}")
            return False