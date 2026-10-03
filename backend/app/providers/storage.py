"""
Storage provider abstraction.
The application only calls StorageProvider methods — it does not
know whether files are stored in GridFS, S3, Supabase, etc.
"""
from typing import Protocol, runtime_checkable, AsyncGenerator


@runtime_checkable
class StorageProvider(Protocol):
    async def store(
        self,
        filename: str,
        content: bytes,
        content_type: str,
        metadata: dict | None = None,
    ) -> str:
        """Store file bytes and return an opaque storage_id."""
        ...

    async def retrieve(self, storage_id: str) -> tuple[bytes, str]:
        """Retrieve file bytes and content_type by storage_id."""
        ...

    async def delete(self, storage_id: str) -> None:
        """Delete a stored file by storage_id."""
        ...


class GridFSStorageProvider:
    """
    Concrete implementation of StorageProvider using MongoDB GridFS.
    Future: replace with SupabaseStorageProvider without touching business logic.
    """

    def __init__(self, gridfs_bucket):
        self._bucket = gridfs_bucket

    async def store(
        self,
        filename: str,
        content: bytes,
        content_type: str,
        metadata: dict | None = None,
    ) -> str:
        import io
        grid_in = self._bucket.open_upload_stream(
            filename,
            metadata={"content_type": content_type, **(metadata or {})},
        )
        await grid_in.write(content)
        await grid_in.close()
        return str(grid_in._id)

    async def retrieve(self, storage_id: str) -> tuple[bytes, str]:
        from bson import ObjectId
        import io
        grid_out = await self._bucket.open_download_stream(ObjectId(storage_id))
        content = await grid_out.read()
        content_type = (grid_out.metadata or {}).get("content_type", "application/octet-stream")
        return content, content_type

    async def delete(self, storage_id: str) -> None:
        from bson import ObjectId
        await self._bucket.delete(ObjectId(storage_id))
