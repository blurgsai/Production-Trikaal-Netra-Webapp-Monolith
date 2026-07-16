from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from bson import ObjectId

from src.features.admin.models import PaginatedVesselImageResponse, VesselImageResponse
from src.features.admin.router import admin_get_vessel_image_file
from src.features.admin.services import get_vessel_image, list_vessel_images


class AsyncCursor:
    def __init__(self, items):
        self.items = items
        self.offset = 0
        self.count = len(items)

    def sort(self, *_args):
        return self

    def skip(self, count):
        self.offset = count
        return self

    def limit(self, count):
        self.count = count
        return self

    def __aiter__(self):
        start = self.offset
        end = start + self.count
        self.iterator = iter(self.items[start:end])
        return self

    async def __anext__(self):
        try:
            return next(self.iterator)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class FakeGridFS:
    def __init__(self, items):
        self.items = items

    def find(self, query):
        if "_id" in query:
            items = [item for item in self.items if item._id == query["_id"]]
            return AsyncCursor(items)
        return AsyncCursor(self.items)

    async def open_download_stream(self, image_id):
        gridfs_file = next(item for item in self.items if item._id == image_id)

        async def read():
            return b"image-content"

        return SimpleNamespace(
            read=read,
            metadata=gridfs_file.metadata,
            filename=gridfs_file.filename,
        )


def make_gridfs_file(imo):
    return SimpleNamespace(
        _id=ObjectId(),
        metadata={"imo": imo, "content_type": "image/jpeg"},
        filename="vessel.jpg",
        length=1024,
        upload_date=datetime.now(UTC),
    )


@pytest.mark.asyncio
async def test_list_vessel_images_normalizes_numeric_imo():
    gridfs = FakeGridFS([make_gridfs_file(9976070)])

    result = await list_vessel_images(gridfs)

    assert result["items"][0]["imo"] == "9976070"
    PaginatedVesselImageResponse.model_validate(result)


@pytest.mark.asyncio
async def test_get_vessel_image_normalizes_numeric_imo():
    gridfs_file = make_gridfs_file(9849916)
    gridfs = FakeGridFS([gridfs_file])

    result = await get_vessel_image(gridfs, str(gridfs_file._id))

    assert result is not None
    assert result["imo"] == "9849916"
    VesselImageResponse.model_validate(result)


@pytest.mark.asyncio
async def test_get_vessel_image_file_serves_image_by_id():
    gridfs_file = make_gridfs_file(9849916)
    gridfs = FakeGridFS([gridfs_file])

    response = await admin_get_vessel_image_file(str(gridfs_file._id), gridfs, None)

    assert response.body == b"image-content"
    assert response.media_type == "image/jpeg"
