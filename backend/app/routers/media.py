"""
Media upload API endpoints.

Provides image upload to Supabase Storage buckets.
All operations require authentication.
"""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from supabase import Client, create_client

from app.auth import User, get_current_user
from app.config import Settings, get_settings
from app.schemas import MediaUploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["media"])


def get_supabase_client(settings: Annotated[Settings, Depends(get_settings)]) -> Client:
    """
    Get Supabase client for storage operations.

    Uses service role key for storage operations.
    """
    if not settings.SUPABASE_JWT_ISSUER or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration not available",
        )

    # Extract base URL from JWT issuer (remove /auth/v1 suffix)
    # SUPABASE_JWT_ISSUER is like: https://xxxxx.supabase.co/auth/v1
    # Supabase client needs: https://xxxxx.supabase.co
    jwt_issuer = settings.SUPABASE_JWT_ISSUER.rstrip("/")
    if jwt_issuer.endswith("/auth/v1"):
        supabase_url = jwt_issuer[:-8]  # Remove "/auth/v1"
    else:
        supabase_url = jwt_issuer
    service_key = settings.SUPABASE_SERVICE_ROLE_KEY

    return create_client(supabase_url, service_key)


@router.post("/upload", response_model=MediaUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(..., description="Image file to upload"),
    user: Annotated[User, Depends(get_current_user)] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,
    supabase: Annotated[Client, Depends(get_supabase_client)] = None,
) -> MediaUploadResponse:
    """
    Upload an image to Supabase Storage.

    Uploads to the user-uploads bucket with user-specific paths.
    Returns the public URL for the uploaded file.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only image files are supported",
        )

    # Read file content
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Empty file",
        )

    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = f"{user.id}/{unique_filename}"

    try:
        # Upload to Supabase Storage
        bucket_name = settings.STORAGE_BUCKET_USER_UPLOADS
        response = supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=content,
            file_options={"content-type": file.content_type},
        )

        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

        logger.info(
            "media.uploaded",
            extra={
                "user_id": user.id,
                "bucket": bucket_name,
                "path": file_path,
                "size": len(content),
                "content_type": file.content_type,
            },
        )

        return MediaUploadResponse(
            url=file_path,
            public_url=public_url,
            bucket=bucket_name,
            path=file_path,
            size=len(content),
            content_type=file.content_type,
        )

    except Exception as exc:
        logger.error(
            "media.upload_failed",
            extra={
                "user_id": user.id,
                "error": str(exc),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(exc)}",
        )


@router.delete("/delete/{file_path:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    file_path: str,
    user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
    supabase: Annotated[Client, Depends(get_supabase_client)],
):
    """
    Delete an uploaded media file.

    Users can only delete their own files (enforced by path prefix).
    """
    # Ensure user can only delete their own files
    expected_prefix = f"{user.id}/"
    if not file_path.startswith(expected_prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own files",
        )

    try:
        bucket_name = settings.STORAGE_BUCKET_USER_UPLOADS
        supabase.storage.from_(bucket_name).remove([file_path])

        logger.info(
            "media.deleted",
            extra={
                "user_id": user.id,
                "bucket": bucket_name,
                "path": file_path,
            },
        )

    except Exception as exc:
        logger.error(
            "media.delete_failed",
            extra={
                "user_id": user.id,
                "file_path": file_path,
                "error": str(exc),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(exc)}",
        )
